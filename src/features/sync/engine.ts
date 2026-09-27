import type { AppDB } from '@/data/db'
import { SYNCED_TABLES, syncedTables, type SyncedTable } from '@/data/schema'

/*
 * Two-way sync between this device's database (the source of truth) and a
 * cloud store, one document per record. Each document holds the record as
 * JSON plus its updatedAt; deletions are documents marked `deleted`. The
 * newest updatedAt wins, per record. Pushes send what changed since the last
 * push; pulls listen for documents the server saw after a saved cursor.
 */

export interface RemoteDoc {
  id: string
  /** JSON of the record, or null for a deletion. */
  data: string | null
  updatedAt: number
  deleted: boolean
}

export interface Remote {
  write(table: SyncedTable, docs: RemoteDoc[]): Promise<void>
  /** Documents the server received after `since` (ms); `serverAt` is the server time. */
  listen(
    table: SyncedTable,
    since: number,
    onDocs: (docs: (RemoteDoc & { serverAt: number })[]) => void,
    onError: (e: unknown) => void,
  ): () => void
  ids(table: SyncedTable): Promise<string[]>
  clear(): Promise<void>
}

export interface KeyValue {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
export interface SyncStatus {
  state: SyncState
  lastSyncedAt: number | null
  error: string | null
  /** Records too big for one cloud document (they stay on this device). */
  tooLarge: number
}

/** Settings that describe this device, not the teacher, so they don't sync. */
export const DEVICE_ONLY_SETTINGS = new Set(['lastScreen', 'legacyMigrationDone', 'activeWorkspace', 'activitiesSeeded'])

/** Firestore documents are limited to 1 MiB; keep a margin. */
export const MAX_DOC_BYTES = 900_000

const PUSH_DELAY = 1500

type Row = Record<string, unknown> & { id: string; updatedAt: number }

/** Drop attached files from a lesson plan that's too big to sync (links stay). */
function shrinkRow(table: SyncedTable, row: Row): Row | null {
  if (table !== 'lessonPlans' || !Array.isArray(row.resources)) return null
  return { ...row, resources: (row.resources as Record<string, unknown>[]).map(({ data: _data, ...r }) => r) }
}

export class SyncEngine {
  private stops: (() => void)[] = []
  private timer: ReturnType<typeof setTimeout> | undefined
  private pushing: Promise<void> | null = null
  private again = false
  private applying = 0
  /** Records just applied from the cloud (not to be pushed back). */
  private applied = new Map<string, number>()
  status: SyncStatus = { state: 'idle', lastSyncedAt: null, error: null, tooLarge: 0 }

  private db: AppDB
  private remote: Remote
  private store: KeyValue
  private onStatus: (s: SyncStatus) => void
  private prefix: string

  constructor(db: AppDB, remote: Remote, store: KeyValue, onStatus: (s: SyncStatus) => void = () => {}, prefix = 'sync:') {
    this.db = db
    this.remote = remote
    this.store = store
    this.onStatus = onStatus
    this.prefix = prefix
    const last = Number(store.get(`${prefix}lastSyncedAt`))
    if (last) this.status.lastSyncedAt = last
  }

  private set(changes: Partial<SyncStatus>) {
    this.status = { ...this.status, ...changes }
    this.onStatus(this.status)
  }

  /** Start listening for local and remote changes, and push what's pending. */
  start() {
    const schedule = () => {
      if (this.applying) return
      clearTimeout(this.timer)
      this.timer = setTimeout(() => void this.push(), PUSH_DELAY)
    }
    for (const name of [...SYNCED_TABLES, 'tombstones'] as const) {
      const t = name === 'tombstones' ? this.db.tombstones : this.db.syncedTable(name)
      const hooks = ['creating', 'updating', 'deleting'] as const
      for (const h of hooks) {
        // Dexie hooks run inside the writing transaction; only schedule here.
        const fn = () => {
          schedule()
        }
        ;(t.hook as (e: string, f: () => void) => void)(h, fn)
        this.stops.push(() => (t.hook as (e: string) => { unsubscribe: (f: () => void) => void })(h).unsubscribe(fn))
      }
    }
    for (const table of SYNCED_TABLES) {
      const since = Number(this.store.get(`${this.prefix}cursor:${table}`)) || 0
      this.stops.push(
        this.remote.listen(
          table,
          since,
          (docs) => void this.pull(table, docs),
          (e) => this.set({ state: 'error', error: e instanceof Error ? e.message : String(e) }),
        ),
      )
    }
    void this.push()
  }

  stop() {
    clearTimeout(this.timer)
    this.stops.forEach((s) => s())
    this.stops = []
  }

  private async pull(table: SyncedTable, docs: (RemoteDoc & { serverAt: number })[]) {
    if (!docs.length) return
    await this.apply(table, docs)
    const cursor = Math.max(Number(this.store.get(`${this.prefix}cursor:${table}`)) || 0, ...docs.map((d) => d.serverAt))
    this.store.set(`${this.prefix}cursor:${table}`, String(cursor))
    this.markSynced()
  }

  /** Apply cloud documents: newer wins; deletions leave tombstones. */
  async apply(table: SyncedTable, docs: RemoteDoc[]) {
    const t = this.db.syncedTable(table)
    const schema = syncedTables[table]
    this.applying++
    try {
      await this.db.transaction('rw', t, this.db.tombstones, async () => {
        for (const d of docs) {
          const key = `${table}:${d.id}`
          const local = (await t.get(d.id)) as Row | undefined
          const tomb = await this.db.tombstones.get(key)
          if (d.updatedAt <= Math.max(local?.updatedAt ?? -1, tomb?.deletedAt ?? -1)) continue
          if (d.deleted) {
            if (local) await t.delete(d.id)
            await this.db.tombstones.put({ id: key, table, recordId: d.id, deletedAt: d.updatedAt })
          } else {
            const parsed = schema.safeParse(JSON.parse(d.data ?? 'null'))
            if (!parsed.success) continue
            await t.put(parsed.data as never)
            if (tomb) await this.db.tombstones.delete(key)
          }
          this.applied.set(key, d.updatedAt)
        }
      })
    } finally {
      this.applying--
    }
  }

  /** Send everything changed since the last push. Calls made while pushing are merged. */
  push(): Promise<void> {
    if (this.pushing) {
      this.again = true
      return this.pushing
    }
    this.pushing = (async () => {
      try {
        do {
          this.again = false
          await this.pushOnce()
        } while (this.again)
      } finally {
        this.pushing = null
      }
    })()
    return this.pushing
  }

  private async pushOnce() {
    const since = Number(this.store.get(`${this.prefix}lastPush`)) || 0
    const started = Date.now()
    this.set({ state: 'syncing', error: null })
    try {
      let tooLarge = 0
      const byTable = new Map<SyncedTable, RemoteDoc[]>()
      const add = (table: SyncedTable, doc: RemoteDoc) => byTable.set(table, [...(byTable.get(table) ?? []), doc])
      const fresh = (table: string, id: string, updatedAt: number) => this.applied.get(`${table}:${id}`) !== updatedAt

      for (const table of SYNCED_TABLES) {
        const rows = (await this.db.syncedTable(table).where('updatedAt').above(since).toArray()) as Row[]
        for (const row of rows) {
          if (table === 'settings' && DEVICE_ONLY_SETTINGS.has(row.id)) continue
          if (!fresh(table, row.id, row.updatedAt)) continue
          let data = JSON.stringify(row)
          if (data.length > MAX_DOC_BYTES) {
            const small = shrinkRow(table, row)
            data = small ? JSON.stringify(small) : data
            if (data.length > MAX_DOC_BYTES) {
              tooLarge++
              continue
            }
          }
          add(table, { id: row.id, data, updatedAt: row.updatedAt, deleted: false })
        }
      }
      for (const tomb of await this.db.tombstones.where('deletedAt').above(since).toArray()) {
        if (!SYNCED_TABLES.includes(tomb.table as SyncedTable) || !fresh(tomb.table, tomb.recordId, tomb.deletedAt)) continue
        add(tomb.table as SyncedTable, { id: tomb.recordId, data: null, updatedAt: tomb.deletedAt, deleted: true })
      }
      for (const [table, docs] of byTable) await this.remote.write(table, docs)
      // Anything stamped from `started` on is picked up by the next push.
      this.store.set(`${this.prefix}lastPush`, String(started - 1))
      this.markSynced(tooLarge)
    } catch (e) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      this.set({ state: offline ? 'offline' : 'error', error: offline ? null : e instanceof Error ? e.message : String(e) })
      throw e
    }
  }

  private markSynced(tooLarge = this.status.tooLarge) {
    const now = Date.now()
    this.store.set(`${this.prefix}lastSyncedAt`, String(now))
    this.set({ state: 'synced', lastSyncedAt: now, error: null, tooLarge })
  }

  /**
   * After an import or restore replaced everything here, make the cloud match:
   * restamp local records so they win, and mark cloud-only records deleted.
   */
  async replaceCloud() {
    const now = Date.now()
    for (const table of SYNCED_TABLES) {
      const t = this.db.syncedTable(table)
      const rows = (await t.toArray()) as Row[]
      const local = new Set(rows.map((r) => r.id))
      await t.bulkPut(rows.map((r) => ({ ...r, updatedAt: now })) as never[])
      const gone = (await this.remote.ids(table)).filter((id) => !local.has(id))
      await this.db.tombstones.bulkPut(gone.map((id) => ({ id: `${table}:${id}`, table, recordId: id, deletedAt: now })))
    }
    this.store.set(`${this.prefix}lastPush`, String(now - 1))
    this.applied.clear()
    await this.push()
  }

  /** Forget this device's sync position (used when sync is turned off). */
  static reset(store: KeyValue, prefix = 'sync:') {
    for (const k of ['lastPush', 'lastSyncedAt', ...SYNCED_TABLES.map((t) => `cursor:${t}`)]) store.remove(`${prefix}${k}`)
  }
}

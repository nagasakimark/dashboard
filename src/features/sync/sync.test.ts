import { afterEach, describe, expect, it } from 'vitest'
import { AppDB } from '@/data/db'
import type { SyncedTable } from '@/data/schema'
import { SyncEngine, type KeyValue, type Remote, type RemoteDoc } from './engine'

/** A fake cloud: one store shared by every "device", with live listeners. */
function memoryCloud() {
  const tables = new Map<string, Map<string, RemoteDoc & { serverAt: number }>>()
  const listeners = new Set<{ table: string; since: number; cb: (d: (RemoteDoc & { serverAt: number })[]) => void }>()
  let clock = 1000
  let writes = 0
  const remote = (): Remote => ({
    async write(table, docs) {
      writes += docs.length
      const t = tables.get(table) ?? new Map()
      tables.set(table, t)
      const stamped = docs.map((d) => ({ ...d, serverAt: ++clock }))
      stamped.forEach((d) => t.set(d.id, d))
      for (const l of listeners) if (l.table === table) queueMicrotask(() => l.cb(stamped))
    },
    listen(table, since, cb) {
      const l = { table, since, cb }
      listeners.add(l)
      const initial = [...(tables.get(table)?.values() ?? [])].filter((d) => d.serverAt > since)
      if (initial.length) queueMicrotask(() => cb(initial))
      return () => listeners.delete(l)
    },
    async ids(table) {
      return [...(tables.get(table)?.keys() ?? [])]
    },
    async clear() {
      tables.clear()
    },
  })
  return { remote, tables, writes: () => writes }
}

const kv = (): KeyValue => {
  const m = new Map<string, string>()
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) }
}

const dbs: AppDB[] = []
let n = 0
const device = () => {
  const db = new AppDB(`sync-test-${n++}`)
  dbs.push(db)
  return db
}
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()))
})

const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms))
/** A to-do stamped `offset` ms from now (records carry real clock times). */
const todo = (id: string, text: string, offset: number) => ({
  id,
  text,
  done: false,
  order: 0,
  createdAt: 1,
  updatedAt: Date.now() + offset,
})

describe('sync engine', () => {
  it('copies records between devices and newest edit wins', async () => {
    const cloud = memoryCloud()
    const a = device()
    const b = device()
    await a.todos.put(todo('t1', 'Print cards', 0))
    const ea = new SyncEngine(a, cloud.remote(), kv())
    const eb = new SyncEngine(b, cloud.remote(), kv())
    ea.start()
    eb.start()
    await ea.push()
    await settle()
    expect((await b.todos.get('t1'))?.text).toBe('Print cards')

    // B edits; A's clock runs 30 ms slow, so its edit counts as older: B's wins everywhere.
    await settle(80)
    await b.todos.put(todo('t1', 'Print and laminate', 0))
    await a.todos.put(todo('t1', 'Old edit', -30))
    await eb.push()
    await ea.push()
    await settle()
    expect((await a.todos.get('t1'))?.text).toBe('Print and laminate')
    expect((await b.todos.get('t1'))?.text).toBe('Print and laminate')
    ea.stop()
    eb.stop()
  })

  it('carries deletions and does not echo applied records back', async () => {
    const cloud = memoryCloud()
    const a = device()
    const b = device()
    const ea = new SyncEngine(a, cloud.remote(), kv())
    const eb = new SyncEngine(b, cloud.remote(), kv())
    ea.start()
    eb.start()
    await a.todos.put(todo('t1', 'Delete me', 0))
    await ea.push()
    await settle()
    const before = cloud.writes()
    await eb.push()
    expect(cloud.writes()).toBe(before) // B has nothing new of its own

    await a.transaction('rw', a.todos, a.tombstones, async () => {
      await a.todos.delete('t1')
      await a.tombstones.put({ id: 'todos:t1', table: 'todos', recordId: 't1', deletedAt: Date.now() })
    })
    await ea.push()
    await settle()
    expect(await b.todos.get('t1')).toBeUndefined()
    expect(await b.tombstones.get('todos:t1')).toBeDefined()
    ea.stop()
    eb.stop()
  })

  it('keeps device-only settings local and skips invalid cloud data', async () => {
    const cloud = memoryCloud()
    const a = device()
    const b = device()
    await a.settings.bulkPut([
      { id: 'profileName', value: 'Alex', updatedAt: 10 },
      { id: 'activeWorkspace', value: 'w1', updatedAt: 10 },
    ])
    const ea = new SyncEngine(a, cloud.remote(), kv())
    await ea.push()
    expect([...(cloud.tables.get('settings')?.keys() ?? [])]).toEqual(['profileName'])

    const eb = new SyncEngine(b, cloud.remote(), kv())
    await eb.apply('todos' as SyncedTable, [{ id: 'bad', data: '{"nope":1}', updatedAt: 5, deleted: false }])
    expect(await b.todos.get('bad')).toBeUndefined()
  })

  it('pulls only what changed since the saved cursor', async () => {
    const cloud = memoryCloud()
    const a = device()
    const store = kv()
    await a.todos.put(todo('t1', 'One', 0))
    const ea = new SyncEngine(a, cloud.remote(), store)
    await ea.push()
    const b = device()
    const storeB = kv()
    const eb = new SyncEngine(b, cloud.remote(), storeB)
    eb.start()
    await settle()
    expect(Number(storeB.get('sync:cursor:todos'))).toBeGreaterThan(0)
    eb.stop()
  })

  it('makes the cloud match this device after an import', async () => {
    const cloud = memoryCloud()
    const a = device()
    const b = device()
    const ea = new SyncEngine(a, cloud.remote(), kv())
    const eb = new SyncEngine(b, cloud.remote(), kv())
    ea.start()
    eb.start()
    await a.todos.bulkPut([todo('keep', 'Keep', 0), todo('drop', 'Drop', 0)])
    await ea.push()
    await settle()
    // An import on B replaced everything with an older file that lacks "drop".
    await b.todos.clear()
    await b.todos.put(todo('keep', 'Keep (from file)', -60_000))
    await settle(5)
    await eb.replaceCloud()
    await settle()
    expect((await a.todos.get('keep'))?.text).toBe('Keep (from file)')
    expect(await a.todos.get('drop')).toBeUndefined()
    ea.stop()
    eb.stop()
  })

  it('a database the browser cleared never deletes cloud data, and re-downloads once the sync position is reset', async () => {
    const cloud = memoryCloud()
    const a = device()
    const store = kv()
    await a.todos.put(todo('t1', 'Lesson notes', 0))
    await a.todos.put(todo('t2', 'Worksheets', 0))
    const ea = new SyncEngine(a, cloud.remote(), store)
    ea.start()
    await ea.push()
    await settle()
    ea.stop()
    expect(cloud.tables.get('todos')?.size).toBe(2)

    // The browser clears the database (storage clean-up); the sync position survived in localStorage.
    await a.todos.clear()
    await a.tombstones.clear()
    const again = new SyncEngine(a, cloud.remote(), store)
    again.start()
    await again.push()
    await settle()
    // Nothing was deleted in the cloud...
    expect([...(cloud.tables.get('todos')?.values() ?? [])].map((d) => d.deleted)).toEqual([false, false])
    // ...but the device stays empty, because its saved position says it already has those documents.
    expect(await a.todos.count()).toBe(0)
    again.stop()

    // With the position reset (what the wipe check does), everything comes back.
    SyncEngine.reset(store)
    const restored = new SyncEngine(a, cloud.remote(), store)
    restored.start()
    await settle()
    expect((await a.todos.toArray()).map((t) => t.text).sort()).toEqual(['Lesson notes', 'Worksheets'])
    restored.stop()
  })
})

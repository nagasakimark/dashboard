import { z } from 'zod'
import { db, type Backup } from './db'
import { DATA_REPLACED, dataEvents } from './events'
import { newId } from './repo'
import { SYNCED_TABLES, syncedTables, type SyncedTable } from './schema'

export const APP_ID = 'alt-dashboard'
export const SCHEMA_VERSION = 1
const MAX_BACKUPS = 5

export type ExportData = { [K in SyncedTable]: z.infer<(typeof syncedTables)[K]>[] }

export interface ExportFile {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: string
  data: ExportData
}

/* ------------------------------------------------------------ export */

export async function buildExport(): Promise<ExportFile> {
  const data = {} as Record<SyncedTable, unknown[]>
  await db.transaction(
    'r',
    SYNCED_TABLES.map((t) => db.syncedTable(t)),
    async () => {
      for (const t of SYNCED_TABLES) data[t] = await db.syncedTable(t).toArray()
    },
  )
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: data as ExportData }
}

export const countRecords = (data: Partial<Record<string, unknown[]>>) =>
  Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v?.length ?? 0]))

export function exportFileName(date = new Date()) {
  const d = date.toISOString().slice(0, 10)
  return `alt-dashboard-${d}.json`
}

/** Trigger a browser download of a JSON document. */
export const downloadJson = (json: string, fileName: string) => downloadText(json, fileName, 'application/json')

/** Trigger a browser download of any text file. */
export function downloadText(text: string, fileName: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ------------------------------------------------------------ import */

export interface ValidationResult {
  ok: boolean
  file?: ExportFile
  counts: Record<string, number>
  /** Human-readable problems (first few per table). */
  errors: string[]
}

/** Recognise our own export format. Legacy formats are handled in ../migrate. */
export function isAppExport(json: unknown): json is { app: string; schemaVersion: number; data: unknown } {
  return typeof json === 'object' && json !== null && (json as { app?: unknown }).app === APP_ID
}

/** Validate every record; the file is accepted only if everything parses. */
export function validateExport(json: unknown): ValidationResult {
  if (!isAppExport(json)) return { ok: false, counts: {}, errors: ['This is not an ALT Dashboard export file.'] }
  if (json.schemaVersion > SCHEMA_VERSION)
    return { ok: false, counts: {}, errors: ['This file was made by a newer version of the app. Update the app and try again.'] }
  const raw = (json.data ?? {}) as Record<string, unknown>
  const errors: string[] = []
  const data = {} as Record<SyncedTable, unknown[]>
  for (const table of SYNCED_TABLES) {
    const rows = raw[table] ?? []
    if (!Array.isArray(rows)) {
      errors.push(`${table}: expected a list`)
      continue
    }
    const parsed = z.array(syncedTables[table]).safeParse(rows)
    if (parsed.success) data[table] = parsed.data
    else
      for (const issue of parsed.error.issues.slice(0, 3))
        errors.push(`${table}[${String(issue.path[0])}].${issue.path.slice(1).join('.')}: ${issue.message}`)
  }
  const file = {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: String((json as { exportedAt?: string }).exportedAt ?? ''),
    data,
  } as ExportFile
  return { ok: errors.length === 0, file: errors.length ? undefined : file, counts: countRecords(data), errors }
}

/**
 * Replace all app data with the file's contents. A backup of the current
 * data is taken first (inside the same transaction, so it can't be lost).
 */
export async function replaceAllData(file: ExportFile, reason = 'Before import'): Promise<Backup> {
  const tables = [...SYNCED_TABLES.map((t) => db.syncedTable(t)), db.tombstones, db.backups]
  let backup!: Backup
  await db.transaction('rw', tables, async () => {
    backup = await createBackup(reason)
    for (const t of SYNCED_TABLES) {
      await db.syncedTable(t).clear()
      const rows = file.data[t] ?? []
      if (rows.length) await db.syncedTable(t).bulkAdd(rows as never[])
    }
    await db.tombstones.clear()
  })
  dataEvents.dispatchEvent(new Event(DATA_REPLACED))
  return backup
}

/* ----------------------------------------------------------- backups */

/** Snapshot all data into the backups table, keeping the newest few. */
export async function createBackup(reason: string): Promise<Backup> {
  const file = await buildExport()
  const backup: Backup = {
    id: newId(),
    createdAt: Date.now(),
    reason,
    counts: countRecords(file.data),
    json: JSON.stringify(file),
  }
  await db.transaction('rw', db.backups, async () => {
    await db.backups.add(backup)
    const all = await db.backups.orderBy('createdAt').reverse().primaryKeys()
    if (all.length > MAX_BACKUPS) await db.backups.bulkDelete(all.slice(MAX_BACKUPS))
  })
  return backup
}

export async function restoreBackup(id: string): Promise<void> {
  const backup = await db.backups.get(id)
  if (!backup) throw new Error('Backup not found')
  const result = validateExport(JSON.parse(backup.json))
  if (!result.ok || !result.file) throw new Error(result.errors.join('\n'))
  await replaceAllData(result.file, 'Before restoring a backup')
}

export const isEmptyData = (counts: Record<string, number>) => Object.entries(counts).every(([k, n]) => k === 'settings' || n === 0)

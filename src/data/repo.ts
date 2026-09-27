import type { z } from 'zod'
import { db } from './db'
import type { SyncedTable, syncedTables } from './schema'

export const newId = () => crypto.randomUUID()

type Stamped = { id: string; createdAt: number; updatedAt: number }

/** Full stored record for a table. */
export type Row<T extends SyncedTable> = z.infer<(typeof syncedTables)[T]>
/** What callers pass when saving: the record, with id/timestamps optional. */
export type Draft<T extends SyncedTable> = Omit<Row<T>, keyof Stamped> & Partial<Stamped>

/** Fill in id/createdAt and bump updatedAt. */
export function stamp<T extends Partial<Stamped>>(record: T, now = Date.now()): T & Stamped {
  return { ...record, id: record.id ?? newId(), createdAt: record.createdAt ?? now, updatedAt: now }
}

/** Insert or replace a record, stamping timestamps. Returns the saved record. */
export async function save<T extends SyncedTable>(table: T, record: Draft<T>): Promise<Row<T>> {
  const row = stamp(record) as Row<T>
  await db.syncedTable(table).put(row as never)
  return row
}

export async function saveMany<T extends SyncedTable>(table: T, records: Draft<T>[]): Promise<Row<T>[]> {
  const now = Date.now()
  const rows = records.map((r) => stamp(r, now)) as Row<T>[]
  await db.syncedTable(table).bulkPut(rows as never[])
  return rows
}

/** Merge a partial update into an existing record. */
export async function patch<T extends SyncedTable>(table: T, id: string, changes: Partial<Omit<Row<T>, keyof Stamped>>): Promise<void> {
  await db.syncedTable(table).update(id, { ...changes, updatedAt: Date.now() } as never)
}

/** Delete records and leave tombstones so deletions can be synced. */
export async function remove(table: SyncedTable, ids: string | string[]): Promise<void> {
  const list = Array.isArray(ids) ? ids : [ids]
  if (!list.length) return
  const now = Date.now()
  await db.transaction('rw', db.syncedTable(table), db.tombstones, async () => {
    await db.syncedTable(table).bulkDelete(list)
    await db.tombstones.bulkPut(list.map((recordId) => ({ id: `${table}:${recordId}`, table, recordId, deletedAt: now })))
  })
}

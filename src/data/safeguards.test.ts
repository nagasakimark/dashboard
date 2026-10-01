import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { checkIntegrity, dismissWipeNotice, resetIntegrityCheck, wipeNoticeAt } from './integrity'
import { save } from './repo'
import { AUTO_BACKUP_REASON, createBackup, replaceAllData, runAutoBackup } from './transfer'
import { formatBytes } from './storage'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  localStorage.clear()
  resetIntegrityCheck()
})

describe('noticing a cleared database', () => {
  it('is quiet on first use and after normal restarts, and notices a wipe once', async () => {
    expect(await checkIntegrity()).toEqual({ wiped: false }) // first use: marker created
    resetIntegrityCheck()
    expect(await checkIntegrity()).toEqual({ wiped: false }) // a normal restart

    // The browser clears IndexedDB; localStorage survives.
    await db.meta.clear()
    resetIntegrityCheck()
    expect(await checkIntegrity()).toEqual({ wiped: true })
    expect(wipeNoticeAt()).toBeGreaterThan(0)
    resetIntegrityCheck()
    expect(await checkIntegrity()).toEqual({ wiped: false }) // the marker is back
    dismissWipeNotice()
    expect(wipeNoticeAt()).toBeNull()
  })

  it('does not mistake importing, restoring or erasing for a wipe', async () => {
    await checkIntegrity()
    await save('todos', { text: 'x', done: false, order: 0 })
    await replaceAllData({ app: 'alt-dashboard', schemaVersion: 1, exportedAt: '', data: {} } as never, 'Before erasing all data')
    resetIntegrityCheck()
    expect(await checkIntegrity()).toEqual({ wiped: false })
  })
})

describe('automatic backups', () => {
  const day = 24 * 3600_000

  it('backs up once a day, only when something changed, never an empty database', async () => {
    expect(await runAutoBackup()).toBeNull() // nothing to back up
    await save('todos', { text: 'Print cards', done: false, order: 0 })
    const first = await runAutoBackup()
    expect(first?.reason).toBe(AUTO_BACKUP_REASON)
    expect(await runAutoBackup()).toBeNull() // already done today
    expect(await runAutoBackup(Date.now() + 2 * day)).toBeNull() // nothing changed since
    await save('todos', { text: 'More', done: false, order: 1 })
    expect(await runAutoBackup(Date.now() + 2 * day)).not.toBeNull()
  })

  it('keeps seven automatic and five other backups, and an empty wipe cannot push them out', async () => {
    await save('todos', { text: 'a', done: false, order: 0 })
    for (let i = 0; i < 9; i++) await createBackup(AUTO_BACKUP_REASON)
    for (let i = 0; i < 7; i++) await createBackup('Manual backup')
    const all = await db.backups.toArray()
    expect(all.filter((b) => b.reason === AUTO_BACKUP_REASON)).toHaveLength(7)
    expect(all.filter((b) => b.reason === 'Manual backup')).toHaveLength(5)
    // The database is emptied (as after a wipe): the automatic backup declines to run.
    await db.todos.clear()
    expect(await runAutoBackup(Date.now() + 5 * day)).toBeNull()
    expect(await db.backups.count()).toBe(12)
  })

  it('formats storage sizes', () => {
    expect(formatBytes(null)).toBe('')
    expect(formatBytes(500)).toBe('1 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

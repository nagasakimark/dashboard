import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { remove, save } from './repo'
import { buildExport, createBackup, replaceAllData, restoreBackup, validateExport } from './transfer'

const school = {
  name: 'Minato ES',
  color: '#4f46e5',
  lunchAfter: 4,
  periodCount: 6,
  jtes: [{ id: 'j1', name: 'Tanaka' }],
  classes: [{ id: 'c1', year: 5, classNumber: 1, jteId: 'j1' }],
  timetables: [{ id: 't1', name: 'A', periods: [{ slot: 1, start: '08:45', end: '09:30' }], lunch: { start: '12:20', end: '13:05' } }],
  archived: false,
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('repo', () => {
  it('stamps ids and timestamps on save', async () => {
    const saved = await save('schools', school)
    expect(saved.id).toMatch(/[0-9a-f-]{36}/)
    expect(saved.createdAt).toBe(saved.updatedAt)
    expect(await db.schools.count()).toBe(1)
  })

  it('leaves a tombstone when deleting', async () => {
    const saved = await save('todos', { text: 'Photocopy worksheets', done: false, order: 0 })
    await remove('todos', saved.id)
    expect(await db.todos.count()).toBe(0)
    expect(await db.tombstones.get(`todos:${saved.id}`)).toMatchObject({ table: 'todos', recordId: saved.id })
  })
})

describe('export / import', () => {
  it('round-trips all data through an export file', async () => {
    const s = await save('schools', school)
    await save('periods', {
      id: '2025-01-06:3',
      date: '2025-01-06',
      slot: 3,
      kind: 'class',
      year: 5,
      classNumber: 1,
      specialType: null,
      summary: 'Unit 3 review',
      lessonPlanId: null,
      curriculumItemId: null,
    })
    await save('dayAssignments', {
      id: '2025-01-06',
      date: '2025-01-06',
      kind: 'school',
      schoolId: s.id,
      timetableId: null,
      dayType: null,
      note: '',
    })

    const file = JSON.parse(JSON.stringify(await buildExport()))
    const result = validateExport(file)
    expect(result.errors).toEqual([])
    expect(result.counts).toMatchObject({ schools: 1, periods: 1, dayAssignments: 1 })

    await Promise.all(db.tables.map((t) => t.clear()))
    await replaceAllData(result.file!)
    expect(await db.periods.get('2025-01-06:3')).toMatchObject({ summary: 'Unit 3 review', slot: 3 })
    expect((await db.schools.toArray())[0].name).toBe('Minato ES')
  })

  it('rejects files that are not ours or are malformed', () => {
    expect(validateExport({ schools: [] }).ok).toBe(false)
    const bad = validateExport({ app: 'alt-dashboard', schemaVersion: 1, data: { schools: [{ id: 'x', name: '' }] } })
    expect(bad.ok).toBe(false)
    expect(bad.errors[0]).toMatch(/^schools\[0\]/)
  })

  it('refuses files from a newer schema version', () => {
    const r = validateExport({ app: 'alt-dashboard', schemaVersion: 999, data: {} })
    expect(r.ok).toBe(false)
    expect(r.errors[0]).toMatch(/newer version/)
  })

  it('backs up current data before replacing it, and can restore it', async () => {
    await save('todos', { text: 'Keep me', done: false, order: 0 })
    const empty = validateExport({ app: 'alt-dashboard', schemaVersion: 1, data: {} })
    const backup = await replaceAllData(empty.file!)
    expect(await db.todos.count()).toBe(0)
    expect(backup.counts.todos).toBe(1)

    await restoreBackup(backup.id)
    expect((await db.todos.toArray())[0].text).toBe('Keep me')
  })

  it('keeps only the five newest backups', async () => {
    for (let i = 0; i < 7; i++) await createBackup(`b${i}`)
    const reasons = (await db.backups.orderBy('createdAt').toArray()).map((b) => b.reason)
    expect(reasons).toHaveLength(5)
    expect(reasons).not.toContain('b0')
  })
})

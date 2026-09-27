import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/data/db'
import { save } from '@/data/repo'
import type { School } from '@/data/schema'
import { addItem, classPosition, createCurriculum, deleteCurriculum, progressIndex, reorderItems, setTaught, trackedClasses } from './model'

const school = (id: string, name: string, classes: [number, number][]): School => ({
  id,
  name,
  color: '#4f46e5',
  lunchAfter: 4,
  periodCount: 6,
  jtes: [],
  classes: classes.map(([year, classNumber], i) => ({ id: `${id}${i}`, year, classNumber, jteId: null })),
  timetables: [{ id: 't', name: 'A', periods: [], lunch: { start: '', end: '' } }],
  archived: false,
  createdAt: 0,
  updatedAt: 0,
})
const es = school('es', 'Tomachi ES', [
  [5, 1],
  [5, 2],
  [6, 1],
])
const jhs = school('jhs', 'Tomachi JHS', [
  [2, 1],
  [5, 3],
])

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('tracked classes', () => {
  it('derives classes from school and year', () => {
    const list = trackedClasses({ classKeys: [], schoolId: 'es', year: 5 }, [es, jhs])
    expect(list.map((c) => c.label)).toEqual(['5-1', '5-2'])
    expect(list.every((c) => c.schoolLabel === '')).toBe(true)
  })
  it('spans schools when only a year is set, prefixing school names', () => {
    const list = trackedClasses({ classKeys: [], schoolId: null, year: 5 }, [es, jhs])
    expect(list.map((c) => `${c.schoolLabel} ${c.label}`)).toEqual(['Tomachi ES 5-1', 'Tomachi ES 5-2', 'Tomachi JHS 5-3'])
  })
  it('uses an explicit class list when present, and nothing when unset', () => {
    expect(trackedClasses({ classKeys: ['jhs:2:1'], schoolId: null, year: null }, [es, jhs]).map((c) => c.label)).toEqual(['2-1'])
    expect(trackedClasses({ classKeys: [], schoolId: null, year: null }, [es, jhs])).toEqual([])
  })
})

describe('curriculum actions', () => {
  it('builds items from a textbook, tracks per-class progress and position', async () => {
    const book = await save('textbooks', { title: 'NH1', cover: '', digitalUrl: '', altopediaUrl: '', preset: null })
    for (const [page, title] of [
      [12, 'I am…'],
      [8, 'Sounds 0'],
      [20, 'He is…'],
    ] as const)
      await save('sections', { textbookId: book.id, page, title, topic: '', notes: '', digitalUrl: '', altopediaUrl: '', order: 0 })
    const c = await createCurriculum(
      { name: 'NH1 plan', description: '', textbookId: book.id, schoolId: 'es', year: 5, classKeys: [] },
      { fromSections: true },
    )
    const items = await db.curriculumItems.where('curriculumId').equals(c.id).sortBy('order')
    expect(items.map((i) => i.text)).toEqual(['p.8 Sounds 0', 'p.12 I am…', 'p.20 He is…'])
    expect(items.every((i) => i.sectionId)).toBe(true)

    await setTaught(items[0], 'es:5:1', true)
    await setTaught(items[1], 'es:5:1', true, '2026-09-28:1')
    await setTaught(items[0], 'es:5:2', true)
    const index = progressIndex(await db.classProgress.toArray())
    expect(classPosition(items, index, 'es:5:1')).toMatchObject({ done: 2, total: 3, next: { text: 'p.20 He is…' } })
    expect(classPosition(items, index, 'es:5:2').next?.text).toBe('p.12 I am…')

    await setTaught(items[0], 'es:5:1', false)
    expect(await db.classProgress.count()).toBe(2)
    expect((await db.classProgress.get(`${items[1].id}|es:5:1`))?.periodId).toBe('2026-09-28:1')
  })

  it('appends and reorders items', async () => {
    const c = await createCurriculum({ name: 'Plan', description: '', textbookId: null, schoolId: null, year: null, classKeys: [] })
    const a = await addItem(c.id, 'A')
    const b = await addItem(c.id, 'B')
    const d = await addItem(c.id, 'C')
    await reorderItems([d.id, a.id, b.id])
    expect((await db.curriculumItems.where('curriculumId').equals(c.id).sortBy('order')).map((i) => i.text)).toEqual(['C', 'A', 'B'])
  })

  it('deleting a curriculum removes items and progress and unlinks periods', async () => {
    const c = await createCurriculum({ name: 'Plan', description: '', textbookId: null, schoolId: null, year: null, classKeys: [] })
    const item = await addItem(c.id, 'Unit 1')
    await setTaught(item, 'es:5:1', true)
    await save('periods', {
      id: '2026-09-28:1',
      date: '2026-09-28',
      slot: 1,
      kind: 'class',
      year: 5,
      classNumber: 1,
      specialType: null,
      summary: '',
      lessonPlanId: null,
      curriculumItemId: item.id,
    })
    await deleteCurriculum(c.id)
    expect(await db.curricula.count()).toBe(0)
    expect(await db.curriculumItems.count()).toBe(0)
    expect(await db.classProgress.count()).toBe(0)
    expect((await db.periods.get('2026-09-28:1'))?.curriculumItemId).toBeNull()
  })
})

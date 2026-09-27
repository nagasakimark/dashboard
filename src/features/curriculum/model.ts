import { db } from '@/data/db'
import { patch, remove, save, saveMany } from '@/data/repo'
import { classKey, type ClassProgress, type Curriculum, type CurriculumItem, type School } from '@/data/schema'
import { bySectionOrder, pageRef } from '@/features/textbooks/format'

export interface TrackedClass {
  key: string
  /** e.g. "5-1" */
  label: string
  /** School name when the tracked classes span several schools, else ''. */
  schoolLabel: string
  year: number
  classNumber: number
  school: School
}

export function parseClassKey(key: string) {
  const [schoolId, year, classNumber] = key.split(':')
  return { schoolId, year: Number(year), classNumber: Number(classNumber) }
}

/**
 * The classes a curriculum is tracked for: its explicit list, or else every
 * class of its year (at its school, if one is set).
 */
export function trackedClasses(c: Pick<Curriculum, 'classKeys' | 'schoolId' | 'year'>, schools: School[]): TrackedClass[] {
  const byId = new Map(schools.map((s) => [s.id, s]))
  const make = (school: School, year: number, classNumber: number): TrackedClass => ({
    key: classKey(school.id, year, classNumber),
    label: `${year}-${classNumber}`,
    schoolLabel: '',
    year,
    classNumber,
    school,
  })
  let list: TrackedClass[]
  if (c.classKeys.length) {
    list = c.classKeys
      .map((k) => {
        const { schoolId, year, classNumber } = parseClassKey(k)
        const school = byId.get(schoolId)
        return school ? make(school, year, classNumber) : null
      })
      .filter((x): x is TrackedClass => !!x)
  } else if (c.year) {
    list = schools
      .filter((s) => !s.archived && (!c.schoolId || s.id === c.schoolId))
      .flatMap((s) => s.classes.filter((cl) => cl.year === c.year).map((cl) => make(s, cl.year, cl.classNumber)))
  } else list = []
  if (new Set(list.map((t) => t.school.id)).size > 1) for (const t of list) t.schoolLabel = t.school.name
  return list.sort((a, b) => a.school.name.localeCompare(b.school.name) || a.year - b.year || a.classNumber - b.classNumber)
}

/** itemId → set of class keys that have done it. */
export function progressIndex(rows: ClassProgress[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!m.has(r.itemId)) m.set(r.itemId, new Set())
    m.get(r.itemId)!.add(r.classKey)
  }
  return m
}

/** How far a class has got: items done and the first item not yet done. */
export function classPosition(items: CurriculumItem[], index: Map<string, Set<string>>, key: string) {
  const done = items.filter((i) => index.get(i.id)?.has(key)).length
  const next = items.find((i) => !index.get(i.id)?.has(key)) ?? null
  return { done, total: items.length, next }
}

/* ------------------------------------------------------------ actions */

export type CurriculumDraft = Pick<Curriculum, 'name' | 'description' | 'textbookId' | 'schoolId' | 'year' | 'classKeys'>

export async function createCurriculum(draft: CurriculumDraft, opts: { fromSections?: boolean } = {}): Promise<Curriculum> {
  const c = await save('curricula', draft)
  if (opts.fromSections && draft.textbookId) {
    const sections = (await db.sections.where('textbookId').equals(draft.textbookId).toArray()).sort(bySectionOrder)
    await saveMany(
      'curriculumItems',
      sections.map((s, order) => ({
        curriculumId: c.id,
        order,
        text: [pageRef(s.page), s.title].filter(Boolean).join(' '),
        sectionId: s.id,
        lessonPlanId: null,
        completed: false,
      })),
    )
  }
  return c
}

export async function addItem(curriculumId: string, text: string, links: Partial<Pick<CurriculumItem, 'sectionId' | 'lessonPlanId'>> = {}) {
  const last = await db.curriculumItems.where('curriculumId').equals(curriculumId).reverse().sortBy('order')
  return save('curriculumItems', {
    curriculumId,
    order: (last[0]?.order ?? -1) + 1,
    text: text.trim(),
    sectionId: links.sectionId ?? null,
    lessonPlanId: links.lessonPlanId ?? null,
    completed: false,
  })
}

/** Persist a new order (ids in their new sequence). */
export async function reorderItems(ids: string[]) {
  await db.transaction('rw', db.curriculumItems, async () => {
    for (const [order, id] of ids.entries()) await patch('curriculumItems', id, { order })
  })
}

export async function deleteItem(id: string) {
  const progress = await db.classProgress.where('itemId').equals(id).primaryKeys()
  const periods = await db.periods.where('curriculumItemId').equals(id).toArray()
  await db.transaction('rw', [db.curriculumItems, db.classProgress, db.periods, db.tombstones], async () => {
    for (const p of periods) await patch('periods', p.id, { curriculumItemId: null })
    await remove('classProgress', progress)
    await remove('curriculumItems', id)
  })
}

export async function deleteCurriculum(id: string) {
  const items = await db.curriculumItems.where('curriculumId').equals(id).primaryKeys()
  for (const itemId of items) await deleteItem(itemId)
  await remove('curricula', id)
}

export const progressId = (itemId: string, key: string) => `${itemId}|${key}`

/** Mark (or unmark) an item as taught for a class. */
export async function setTaught(
  item: Pick<CurriculumItem, 'id' | 'curriculumId'>,
  key: string,
  taught: boolean,
  periodId: string | null = null,
) {
  const id = progressId(item.id, key)
  if (!taught) return remove('classProgress', id)
  const existing = await db.classProgress.get(id)
  await save('classProgress', {
    id,
    itemId: item.id,
    curriculumId: item.curriculumId,
    classKey: key,
    doneAt: existing?.doneAt ?? Date.now(),
    periodId: periodId ?? existing?.periodId ?? null,
  })
}

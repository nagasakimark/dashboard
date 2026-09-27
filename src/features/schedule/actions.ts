import { db } from '@/data/db'
import { remove, save, type Draft } from '@/data/repo'
import { periodId, type DayAssignment, type Period, type Slot } from '@/data/schema'

/**
 * Schedule mutations. Each returns an Undo that restores exactly the records
 * it touched, so the UI can offer "Undo" on every change.
 */
export type Undo = () => Promise<void>

interface Snapshot {
  periods: Period[]
  periodIds: string[]
  days: DayAssignment[]
  dayIds: string[]
}

async function snapshot(periodIds: string[], dayIds: string[] = []): Promise<Snapshot> {
  const [periods, days] = await Promise.all([db.periods.bulkGet(periodIds), db.dayAssignments.bulkGet(dayIds)])
  return { periods: periods.filter((p): p is Period => !!p), periodIds, days: days.filter((d): d is DayAssignment => !!d), dayIds }
}

function undoTo(s: Snapshot): Undo {
  return async () => {
    await db.transaction('rw', db.periods, db.dayAssignments, db.tombstones, async () => {
      const keepP = new Set(s.periods.map((p) => p.id))
      const keepD = new Set(s.days.map((d) => d.id))
      await remove(
        'periods',
        s.periodIds.filter((id) => !keepP.has(id)),
      )
      await remove(
        'dayAssignments',
        s.dayIds.filter((id) => !keepD.has(id)),
      )
      if (s.periods.length) await db.periods.bulkPut(s.periods.map((p) => ({ ...p, updatedAt: Date.now() })))
      if (s.days.length) await db.dayAssignments.bulkPut(s.days.map((d) => ({ ...d, updatedAt: Date.now() })))
      await db.tombstones.bulkDelete([...keepP].map((id) => `periods:${id}`).concat([...keepD].map((id) => `dayAssignments:${id}`)))
    })
  }
}

export type PeriodInput = Omit<Draft<'periods'>, 'id'>

export async function savePeriod(input: PeriodInput): Promise<Undo> {
  const id = periodId(input.date, input.slot)
  const before = await snapshot([id])
  const existing = before.periods[0]
  await save('periods', { ...input, id, createdAt: existing?.createdAt })
  return undoTo(before)
}

export async function deletePeriod(id: string): Promise<Undo> {
  const before = await snapshot([id])
  await remove('periods', id)
  return undoTo(before)
}

/**
 * Move (or copy) a period to another date/slot. If the target already has a
 * period, the two swap places when moving; copying overwrites the target.
 */
export async function movePeriod(fromId: string, to: { date: string; slot: Slot }, copy = false): Promise<Undo | null> {
  const targetId = periodId(to.date, to.slot)
  if (targetId === fromId) return null
  const before = await snapshot([fromId, targetId])
  const source = before.periods.find((p) => p.id === fromId)
  if (!source) return null
  const target = before.periods.find((p) => p.id === targetId)
  await db.transaction('rw', db.periods, db.tombstones, async () => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = source
    await save('periods', { ...fields, date: to.date, slot: to.slot, id: targetId })
    if (copy) return
    if (target) {
      const { id: _tid, createdAt: _tc, updatedAt: _tu, ...tFields } = target
      await save('periods', { ...tFields, date: source.date, slot: source.slot, id: fromId })
    } else await remove('periods', fromId)
  })
  return undoTo(before)
}

export type DayInput = Omit<Draft<'dayAssignments'>, 'id'>

export async function saveDay(input: DayInput): Promise<Undo> {
  const before = await snapshot([], [input.date])
  await save('dayAssignments', { ...input, id: input.date, createdAt: before.days[0]?.createdAt })
  return undoTo(before)
}

/** Remove the day's assignment and (optionally) all its periods. */
export async function clearDay(date: string, withPeriods = true): Promise<Undo> {
  const ids = withPeriods ? await db.periods.where('date').equals(date).primaryKeys() : []
  const before = await snapshot(ids, [date])
  await db.transaction('rw', db.periods, db.dayAssignments, db.tombstones, async () => {
    await remove('dayAssignments', date)
    await remove('periods', ids)
  })
  return undoTo(before)
}

/** Copy a whole day (assignment + periods) onto another date, replacing it. */
export async function copyDay(from: string, to: string): Promise<Undo> {
  const [day, periods, targetIds] = await Promise.all([
    db.dayAssignments.get(from),
    db.periods.where('date').equals(from).toArray(),
    db.periods.where('date').equals(to).primaryKeys(),
  ])
  const newIds = periods.map((p) => periodId(to, p.slot))
  const before = await snapshot([...new Set([...targetIds, ...newIds])], [to])
  await db.transaction('rw', db.periods, db.dayAssignments, db.tombstones, async () => {
    await remove('periods', targetIds)
    if (day) {
      const { id: _i, createdAt: _c, updatedAt: _u, ...d } = day
      await save('dayAssignments', { ...d, id: to, date: to })
    } else await remove('dayAssignments', to)
    for (const p of periods) {
      const { id: _i, createdAt: _c, updatedAt: _u, ...fields } = p
      await save('periods', { ...fields, id: periodId(to, p.slot), date: to, summary: '', lessonPlanId: null, curriculumItemId: null })
    }
  })
  return undoTo(before)
}

import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/data/db'
import type { Period, School } from '@/data/schema'
import { clearDay, copyDay, deletePeriod, movePeriod, saveDay, savePeriod, type PeriodInput } from './actions'
import { daySlots, parseClass, previousForClass, slotTimes, timetableFor, weekDays } from './model'

const school = {
  id: 's1',
  name: 'Sakura ES',
  color: '#e11d48',
  lunchAfter: 4,
  periodCount: 6,
  jtes: [],
  classes: [],
  timetables: [
    { id: 'A', name: 'A', periods: [{ slot: 1, start: '08:45', end: '09:30' }], lunch: { start: '12:20', end: '13:05' } },
    { id: 'B', name: 'B', periods: [{ slot: 1, start: '09:00', end: '09:45' }], lunch: { start: '', end: '' } },
  ],
  archived: false,
  createdAt: 0,
  updatedAt: 0,
} satisfies School

const cls = (date: string, slot: Period['slot'], year: number, classNumber: number, summary = ''): PeriodInput => ({
  date,
  slot,
  kind: 'class',
  year,
  classNumber,
  specialType: null,
  summary,
  lessonPlanId: null,
  curriculumItemId: null,
})

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('model', () => {
  it('lists weekdays for the week of a date', () => {
    const days = weekDays(new Date(2026, 8, 30), 1, false).map((d) => d.getDate())
    expect(days).toEqual([28, 29, 30, 1, 2])
    expect(weekDays(new Date(2026, 8, 30), 0, true)).toHaveLength(7)
  })

  it('places lunch after the school’s lunch period', () => {
    expect(daySlots(school)).toEqual([1, 2, 3, 4, 'lunch', 5, 6])
    expect(daySlots(null)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('resolves timetables and slot times, falling back to the first timetable', () => {
    const day = { timetableId: 'B' } as never
    expect(slotTimes(timetableFor(school, day), 1)).toEqual({ start: '09:00', end: '09:45' })
    expect(timetableFor(school, { timetableId: 'gone' } as never)?.id).toBe('A')
    expect(slotTimes(timetableFor(school, null), 'lunch')).toEqual({ start: '12:20', end: '13:05' })
    expect(slotTimes(timetableFor(school, day), 'lunch')).toBeNull()
  })

  it('parses quick class entry', () => {
    expect(parseClass('5-1')).toEqual({ year: 5, classNumber: 1 })
    expect(parseClass(' 6 / 3 ')).toEqual({ year: 6, classNumber: 3 })
    expect(parseClass('5')).toBeNull()
    expect(parseClass('0-1')).toBeNull()
  })

  it('finds the previous lesson for the same class, else the same year', () => {
    const p = (date: string, slot: Period['slot'], year: number, classNumber: number, summary: string) =>
      ({ ...cls(date, slot, year, classNumber, summary), id: `${date}:${slot}`, createdAt: 0, updatedAt: 0 }) as Period
    const periods = [
      p('2026-09-01', 1, 5, 1, 'Unit 1 hello'),
      p('2026-09-02', 2, 5, 2, 'Unit 1 hello (5-2)'),
      p('2026-09-03', 3, 5, 1, 'Unit 1 review'),
      p('2026-09-03', 'lunch', 5, 1, ''),
      p('2026-09-10', 1, 5, 1, 'Future lesson'),
    ]
    expect(previousForClass(periods, { date: '2026-09-04', slot: 1, year: 5, classNumber: 1 })?.summary).toBe('Unit 1 review')
    // Same day, earlier slot counts; later slot doesn't.
    expect(previousForClass(periods, { date: '2026-09-03', slot: 3, year: 5, classNumber: 1 })?.summary).toBe('Unit 1 hello')
    // No history for 5-3: fall back to the latest in year 5.
    expect(previousForClass(periods, { date: '2026-09-04', slot: 1, year: 5, classNumber: 3 })?.summary).toBe('Unit 1 review')
    expect(previousForClass(periods, { date: '2026-09-04', slot: 1, year: 6, classNumber: 1 })).toBeNull()
  })
})

describe('actions with undo', () => {
  it('saves a period and undoes back to nothing', async () => {
    const undo = await savePeriod(cls('2026-09-28', 1, 5, 1, 'Hello'))
    expect(await db.periods.get('2026-09-28:1')).toMatchObject({ summary: 'Hello' })
    await undo()
    expect(await db.periods.get('2026-09-28:1')).toBeUndefined()
  })

  it('undoing an edit restores the previous version', async () => {
    await savePeriod(cls('2026-09-28', 1, 5, 1, 'v1'))
    const undo = await savePeriod(cls('2026-09-28', 1, 5, 1, 'v2'))
    await undo()
    expect((await db.periods.get('2026-09-28:1'))?.summary).toBe('v1')
    expect(await db.tombstones.count()).toBe(0)
  })

  it('moves into an empty slot, swaps with an occupied one, and copies', async () => {
    await savePeriod(cls('2026-09-28', 1, 5, 1, 'A'))
    await savePeriod(cls('2026-09-28', 2, 5, 2, 'B'))

    const undoMove = await movePeriod('2026-09-28:1', { date: '2026-09-29', slot: 3 })
    expect(await db.periods.get('2026-09-28:1')).toBeUndefined()
    expect((await db.periods.get('2026-09-29:3'))?.summary).toBe('A')
    await undoMove!()
    expect((await db.periods.get('2026-09-28:1'))?.summary).toBe('A')
    expect(await db.periods.get('2026-09-29:3')).toBeUndefined()

    await movePeriod('2026-09-28:1', { date: '2026-09-28', slot: 2 })
    expect((await db.periods.get('2026-09-28:2'))?.summary).toBe('A')
    expect((await db.periods.get('2026-09-28:1'))?.summary).toBe('B')

    await movePeriod('2026-09-28:1', { date: '2026-09-30', slot: 'lunch' }, true)
    expect((await db.periods.get('2026-09-30:lunch'))?.summary).toBe('B')
    expect((await db.periods.get('2026-09-28:1'))?.summary).toBe('B')
  })

  it('deletes with an undo', async () => {
    await savePeriod(cls('2026-09-28', 1, 5, 1, 'A'))
    const undo = await deletePeriod('2026-09-28:1')
    expect(await db.periods.count()).toBe(0)
    await undo()
    expect(await db.periods.count()).toBe(1)
  })

  it('clears a day with its periods, and copies a day layout', async () => {
    await saveDay({ date: '2026-09-28', kind: 'school', schoolId: 's1', timetableId: 'B', dayType: null, note: '' })
    await savePeriod(cls('2026-09-28', 1, 5, 1, 'A'))
    await savePeriod(cls('2026-09-28', 3, 6, 2, 'B'))

    const undoCopy = await copyDay('2026-09-28', '2026-10-05')
    expect((await db.dayAssignments.get('2026-10-05'))?.timetableId).toBe('B')
    expect(await db.periods.get('2026-10-05:3')).toMatchObject({ year: 6, classNumber: 2, summary: '' })
    await undoCopy()
    expect(await db.dayAssignments.get('2026-10-05')).toBeUndefined()
    expect(await db.periods.where('date').equals('2026-10-05').count()).toBe(0)

    const undoClear = await clearDay('2026-09-28')
    expect(await db.periods.count()).toBe(0)
    expect(await db.dayAssignments.count()).toBe(0)
    await undoClear()
    expect(await db.periods.count()).toBe(2)
    expect((await db.dayAssignments.get('2026-09-28'))?.schoolId).toBe('s1')
  })
})

describe('tally', async () => {
  const { computeTally } = await import('./tally')
  const day = (date: string, schoolId: string | null, kind: 'school' | 'off' = 'school', dayType: string | null = null) =>
    ({ id: date, date, kind, schoolId, timetableId: null, dayType, note: '', createdAt: 0, updatedAt: 0 }) as const
  const per = (date: string, slot: Period['slot'], p: Partial<Period>) =>
    ({ ...cls(date, slot, 1, 1), ...p, id: `${date}:${slot}`, createdAt: 0, updatedAt: 0 }) as Period
  const withJte = { ...school, jtes: [{ id: 'j', name: 'Ms. Sato' }], classes: [{ id: 'c', year: 5, classNumber: 1, jteId: 'j' }] }

  it('counts lessons per class, lunches, activities and days off within range', () => {
    const t = computeTally({
      schools: [withJte],
      days: [day('2026-09-28', 's1'), day('2026-09-29', 's1'), day('2026-09-30', null, 'off', 'Public Holiday'), day('2026-10-10', 's1')],
      periods: [
        per('2026-09-28', 1, { year: 5, classNumber: 1 }),
        per('2026-09-28', 2, { year: 5, classNumber: 1 }),
        per('2026-09-28', 'lunch', { year: 5, classNumber: 1 }),
        per('2026-09-29', 1, { year: 6, classNumber: 2 }),
        per('2026-09-29', 2, { kind: 'special', year: null, classNumber: null, specialType: 'Marking' }),
        per('2026-10-01', 1, { year: 3, classNumber: 1 }),
        per('2026-10-10', 1, { year: 5, classNumber: 1 }),
      ],
      from: '2026-09-28',
      to: '2026-10-04',
    })
    const s = t.schools[0]
    expect(s.days).toBe(2)
    expect(s.lessons).toBe(3)
    expect(s.lunches).toBe(1)
    expect(s.classes.get('5-1')?.count).toBe(2)
    expect(Object.fromEntries(s.byJte)).toEqual({ 'Ms. Sato': 2, 'No JTE': 1 })
    expect(Object.fromEntries(t.activities)).toEqual({ Marking: 1 })
    expect(Object.fromEntries(t.dayTypes)).toEqual({ 'Public Holiday': 1 })
    expect(t.unassignedLessons).toBe(1)
    expect(t.totalLessons).toBe(3)
  })
  it('builds the weekly per-class table like the original planner', async () => {
    const { weeklyTally, tallyWeeks, tallyKey } = await import('./tally')
    const other = { ...school, id: 's2', name: 'Other' }
    const weeks = tallyWeeks(new Date(2026, 8, 30), 2, 1)
    expect(weeks[0].start.getDate()).toBe(28)
    const t = weeklyTally({
      schools: [other, school],
      weeks,
      days: [day('2026-09-28', 's1'), day('2026-10-06', 's1'), day('2026-10-07', 's2')],
      periods: [
        per('2026-09-28', 1, { year: 6, classNumber: 2 }),
        per('2026-09-28', 2, { year: 5, classNumber: 1 }),
        per('2026-09-28', 'lunch', { year: 5, classNumber: 1 }),
        per('2026-10-06', 1, { year: 5, classNumber: 1 }),
        per('2026-10-07', 1, { year: 1, classNumber: 1 }),
        per('2026-10-20', 1, { year: 5, classNumber: 1 }),
      ],
    })
    expect(t.groups.map((g) => [g.school.id, g.classes])).toEqual([
      ['s2', ['1-1']],
      ['s1', ['5-1', '6-2']],
    ])
    expect(t.rows.map((r) => r.counts.get(tallyKey('s1', '5-1')) ?? 0)).toEqual([1, 1])
    expect(t.totals.get(tallyKey('s1', '5-1'))).toBe(2)
    expect(t.totals.get(tallyKey('s1', '6-2'))).toBe(1)
  })
})

describe('upcoming', async () => {
  const { withTimes, upcoming, current } = await import('./upcoming')
  const s = {
    ...school,
    timetables: [
      {
        id: 'A',
        name: 'A',
        periods: [
          { slot: 1, start: '08:45', end: '09:35' },
          { slot: 2, start: '09:45', end: '10:35' },
        ],
        lunch: { start: '12:35', end: '13:20' },
      },
    ],
  }
  const day = {
    id: '2026-09-28',
    date: '2026-09-28',
    kind: 'school',
    schoolId: 's1',
    timetableId: null,
    dayType: null,
    note: '',
    createdAt: 0,
    updatedAt: 0,
  } as const
  const mk = (date: string, slot: Period['slot'], extra: Partial<Period> = {}) =>
    ({ ...cls(date, slot, 5, 1), ...extra, id: `${date}:${slot}`, createdAt: 0, updatedAt: 0 }) as Period
  const timed = withTimes(
    [
      mk('2026-09-29', 1),
      mk('2026-09-28', 2),
      mk('2026-09-28', 1),
      mk('2026-09-28', 'lunch'),
      mk('2026-09-28', 3, { kind: 'special', year: null, classNumber: null, specialType: 'Marking' }),
    ],
    new Map([[day.date, day]]),
    new Map([['s1', s]]),
  )

  it('uses real timetable times, not a fixed 8:00 + 50 min guess', () => {
    const p1 = timed.find((t) => t.period.id === '2026-09-28:1')!
    expect(p1.start?.getHours()).toBe(8)
    expect(p1.start?.getMinutes()).toBe(45)
    expect(p1.end?.getMinutes()).toBe(35)
  })

  it('lists classes that have not finished yet, in order', () => {
    const now = new Date(2026, 8, 28, 9, 0)
    expect(upcoming(timed, now).map((t) => t.period.id)).toEqual(['2026-09-28:1', '2026-09-28:2', '2026-09-29:1'])
    expect(current(timed, now)?.period.id).toBe('2026-09-28:1')
    const later = new Date(2026, 8, 28, 9, 40)
    expect(upcoming(timed, later).map((t) => t.period.id)).toEqual(['2026-09-28:2', '2026-09-29:1'])
    expect(current(timed, later)).toBeNull()
    expect(upcoming(timed, later, { includeSpecial: true, includeLunch: true }).map((t) => t.period.id)).toEqual([
      '2026-09-28:2',
      '2026-09-28:3',
      '2026-09-28:lunch',
      '2026-09-29:1',
    ])
  })
})

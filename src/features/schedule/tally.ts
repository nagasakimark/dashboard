import { addDays, addWeeks, startOfWeek } from 'date-fns'
import type { DayAssignment, Period, School } from '@/data/schema'
import { iso } from './model'

export interface SchoolTally {
  school: School
  /** Days assigned to this school in range. */
  days: number
  /** Lessons (not lunch) per `year-class`. */
  classes: Map<string, { year: number; classNumber: number; count: number }>
  lessons: number
  lunches: number
  /** Lessons per JTE name ("No JTE" when unassigned). */
  byJte: Map<string, number>
}

export interface Tally {
  schools: SchoolTally[]
  /** Other activities by type (Lesson Planning, Marking, …). */
  activities: Map<string, number>
  /** Days off by type (Public Holiday, Paid Leave, …). */
  dayTypes: Map<string, number>
  totalLessons: number
  /** Lessons on days with no school assigned. */
  unassignedLessons: number
}

const bump = <K>(m: Map<K, number>, k: K, n = 1) => m.set(k, (m.get(k) ?? 0) + n)

/**
 * Count teaching between two ISO dates (inclusive). Lunch periods are counted
 * separately from lessons, matching the original planner's tally.
 */
export function computeTally(opts: {
  periods: Period[]
  days: DayAssignment[]
  schools: School[]
  from: string
  to: string
  schoolId?: string | null
}): Tally {
  const { from, to, schoolId } = opts
  const inRange = (d: string) => d >= from && d <= to
  const dayByDate = new Map(opts.days.map((d) => [d.date, d]))
  const tallies = new Map<string, SchoolTally>()
  const tallyFor = (s: School) => {
    let t = tallies.get(s.id)
    if (!t) tallies.set(s.id, (t = { school: s, days: 0, classes: new Map(), lessons: 0, lunches: 0, byJte: new Map() }))
    return t
  }
  const schools = new Map(opts.schools.map((s) => [s.id, s]))
  const activities = new Map<string, number>()
  const dayTypes = new Map<string, number>()
  let unassignedLessons = 0

  for (const d of opts.days) {
    if (!inRange(d.date)) continue
    if (d.kind === 'off') bump(dayTypes, d.dayType ?? 'Other')
    else if (d.schoolId && schools.has(d.schoolId) && (!schoolId || d.schoolId === schoolId)) tallyFor(schools.get(d.schoolId)!).days++
  }

  for (const p of opts.periods) {
    if (!inRange(p.date)) continue
    const day = dayByDate.get(p.date)
    const school = day?.schoolId ? schools.get(day.schoolId) : undefined
    if (schoolId && school?.id !== schoolId) continue
    if (p.kind === 'special') {
      bump(activities, p.specialType ?? 'Other')
      continue
    }
    if (!p.year || !p.classNumber) continue
    if (!school) {
      if (p.slot !== 'lunch') unassignedLessons++
      continue
    }
    const t = tallyFor(school)
    if (p.slot === 'lunch') {
      t.lunches++
      continue
    }
    t.lessons++
    const key = `${p.year}-${p.classNumber}`
    const c = t.classes.get(key) ?? { year: p.year, classNumber: p.classNumber, count: 0 }
    c.count++
    t.classes.set(key, c)
    const cls = school.classes.find((x) => x.year === p.year && x.classNumber === p.classNumber)
    const jte = school.jtes.find((j) => j.id === cls?.jteId)?.name ?? 'No JTE'
    bump(t.byJte, jte)
  }

  const list = [...tallies.values()].sort((a, b) => b.lessons - a.lessons || a.school.name.localeCompare(b.school.name))
  return {
    schools: list,
    activities,
    dayTypes,
    totalLessons: list.reduce((n, t) => n + t.lessons, 0),
    unassignedLessons,
  }
}

/** Classes grouped by year and sorted, for table display. */
export function classesByYear(t: SchoolTally): [number, { classNumber: number; count: number }[]][] {
  const m = new Map<number, { classNumber: number; count: number }[]>()
  for (const c of t.classes.values()) m.set(c.year, [...(m.get(c.year) ?? []), { classNumber: c.classNumber, count: c.count }])
  return [...m].sort(([a], [b]) => a - b).map(([y, list]) => [y, list.sort((a, b) => a.classNumber - b.classNumber)])
}

/** A week of the tally: its first day and the Monday–Friday span used for labels. */
export interface TallyWeek {
  start: Date
  /** First and last weekday, for labels like "Jan 6 – Jan 10". */
  first: Date
  last: Date
}

/** `count` consecutive weeks from the week containing `start`. */
export function tallyWeeks(start: Date, count: number, weekStartsOn: 0 | 1): TallyWeek[] {
  const first = startOfWeek(start, { weekStartsOn })
  const offset = weekStartsOn === 0 ? 1 : 0
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    const s = addWeeks(first, i)
    return { start: s, first: addDays(s, offset), last: addDays(s, offset + 4) }
  })
}

export interface WeeklyTally {
  /** Schools with at least one class taught, in the user's order, each with its classes ("5-1") sorted. */
  groups: { school: School; classes: string[] }[]
  /** Per week, lessons keyed `${schoolId}|${class}`. */
  rows: { week: TallyWeek; counts: Map<string, number> }[]
  totals: Map<string, number>
}

export const tallyKey = (schoolId: string, cls: string) => `${schoolId}|${cls}`

/**
 * The original planner's tally: lessons (not lunch) per class per week, for
 * periods on days assigned to that class's school.
 */
export function weeklyTally(opts: { periods: Period[]; days: DayAssignment[]; schools: School[]; weeks: TallyWeek[] }): WeeklyTally {
  const dayByDate = new Map(opts.days.map((d) => [d.date, d]))
  const schools = new Map(opts.schools.map((s) => [s.id, s]))
  const classes = new Map<string, Set<string>>()
  const totals = new Map<string, number>()
  const rows = opts.weeks.map((week) => ({ week, counts: new Map<string, number>() }))
  const ranges = rows.map((r) => [iso(r.week.start), iso(addDays(r.week.start, 6))] as const)

  for (const p of opts.periods) {
    if (p.kind !== 'class' || p.slot === 'lunch' || !p.year || !p.classNumber) continue
    const i = ranges.findIndex(([a, b]) => p.date >= a && p.date <= b)
    if (i < 0) continue
    const schoolId = dayByDate.get(p.date)?.schoolId
    if (!schoolId || !schools.has(schoolId)) continue
    const cls = `${p.year}-${p.classNumber}`
    const key = tallyKey(schoolId, cls)
    if (!classes.has(schoolId)) classes.set(schoolId, new Set())
    classes.get(schoolId)!.add(cls)
    bump(rows[i].counts, key)
    bump(totals, key)
  }

  const byNumber = (a: string, b: string) => {
    const [ay, ac] = a.split('-').map(Number)
    const [by, bc] = b.split('-').map(Number)
    return ay - by || ac - bc
  }
  const groups = opts.schools
    .filter((s) => classes.has(s.id))
    .map((school) => ({ school, classes: [...classes.get(school.id)!].sort(byNumber) }))
  return { groups, rows, totals }
}

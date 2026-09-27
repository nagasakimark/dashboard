import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '@/data/db'
import type { DayAssignment, LessonPlan, Period, School } from '@/data/schema'

/** All schools (active first, then by name). `undefined` while loading. */
export function useSchools(): School[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.schools.toArray()
    return all.sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name))
  }, [])
}

export function useSchoolMap(): Map<string, School> {
  const schools = useSchools()
  return useMemo(() => new Map((schools ?? []).map((s) => [s.id, s])), [schools])
}

/** Day assignments and periods between two ISO dates (inclusive). */
export function useScheduleRange(from: string, to: string) {
  const data = useLiveQuery(async () => {
    const [days, periods] = await Promise.all([
      db.dayAssignments.where('date').between(from, to, true, true).toArray(),
      db.periods.where('date').between(from, to, true, true).toArray(),
    ])
    return { days, periods }
  }, [from, to])
  return useMemo(() => {
    if (!data) return undefined
    return {
      days: new Map<string, DayAssignment>(data.days.map((d) => [d.date, d])),
      periods: new Map<string, Period>(data.periods.map((p) => [p.id, p])),
      periodList: data.periods,
    }
  }, [data])
}

/** Lesson plans by id (for titles on the calendar). */
export function useLessonPlanMap(): Map<string, LessonPlan> {
  const plans = useLiveQuery(() => db.lessonPlans.toArray(), [])
  return useMemo(() => new Map((plans ?? []).map((p) => [p.id, p])), [plans])
}

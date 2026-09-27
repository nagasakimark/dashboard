import type { DayAssignment, Period, School } from '@/data/schema'
import { daySlots, iso, slotOrder, slotTimes, timetableFor } from './model'

export interface TimedPeriod {
  period: Period
  school: School | undefined
  day: DayAssignment | undefined
  /** Start/end as Dates when the timetable has times, else null. */
  start: Date | null
  end: Date | null
}

const at = (date: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${date}T00:00:00`)
  d.setHours(h, m, 0, 0)
  return d
}

/** Attach real start/end times from each day's school timetable. */
export function withTimes(periods: Period[], days: Map<string, DayAssignment>, schools: Map<string, School>): TimedPeriod[] {
  return periods
    .map((period) => {
      const day = days.get(period.date)
      const school = day?.schoolId ? schools.get(day.schoolId) : undefined
      const t = slotTimes(timetableFor(school, day), period.slot)
      return { period, school, day, start: t?.start ? at(period.date, t.start) : null, end: t?.end ? at(period.date, t.end) : null }
    })
    .sort((a, b) =>
      a.period.date === b.period.date
        ? slotOrder(a.period.slot, a.school?.lunchAfter) - slotOrder(b.period.slot, b.school?.lunchAfter)
        : a.period.date < b.period.date
          ? -1
          : 1,
    )
}

/**
 * Periods that haven't finished yet, soonest first. Without timetable times,
 * today's periods count as upcoming until the end of the day.
 */
export function upcoming(timed: TimedPeriod[], now: Date, opts: { includeSpecial?: boolean; includeLunch?: boolean } = {}): TimedPeriod[] {
  const today = iso(now)
  return timed.filter(({ period, end }) => {
    if (!opts.includeSpecial && period.kind !== 'class') return false
    if (!opts.includeLunch && period.slot === 'lunch') return false
    if (period.date > today) return true
    if (period.date < today) return false
    return end ? end > now : true
  })
}

/** The period happening right now, if any. */
export const current = (timed: TimedPeriod[], now: Date) => timed.find((t) => t.start && t.end && t.start <= now && now < t.end) ?? null

/** Every slot of a day (filled or empty) with its times, for the Today view. */
export function daySchedule(date: string, day: DayAssignment | undefined, school: School | undefined, periods: Map<string, Period>) {
  const timetable = timetableFor(school, day)
  return daySlots(school).map((slot) => {
    const t = slotTimes(timetable, slot)
    return {
      slot,
      period: periods.get(`${date}:${slot}`),
      start: t?.start ? at(date, t.start) : null,
      end: t?.end ? at(date, t.end) : null,
      times: t,
    }
  })
}

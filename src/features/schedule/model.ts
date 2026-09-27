import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import type { DayAssignment, LessonPlan, Period, School, Slot, Timetable } from '@/data/schema'

/** Calendar date (local) as YYYY-MM-DD. */
export const iso = (d: Date) => format(d, 'yyyy-MM-dd')
export const fromIso = (s: string) => parseISO(s)

export function weekDays(anchor: Date, weekStartsOn: 0 | 1, includeWeekend: boolean): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn })
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return includeWeekend ? days : days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6)
}

export const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6

/** Ordered period slots for a day, with lunch after the school's lunch period. */
export function daySlots(school: School | null | undefined): Slot[] {
  const count = school?.periodCount ?? 6
  const slots: Slot[] = []
  for (let n = 1; n <= count; n++) {
    slots.push(n)
    if (school && n === school.lunchAfter) slots.push('lunch')
  }
  return slots
}

export function timetableFor(school: School | null | undefined, day: DayAssignment | null | undefined): Timetable | null {
  if (!school) return null
  return school.timetables.find((t) => t.id === day?.timetableId) ?? school.timetables[0] ?? null
}

export function slotTimes(timetable: Timetable | null, slot: Slot): { start: string; end: string } | null {
  if (!timetable) return null
  const t = slot === 'lunch' ? timetable.lunch : timetable.periods.find((p) => p.slot === slot)
  return t && (t.start || t.end) ? { start: t.start, end: t.end } : null
}

export const slotLabel = (slot: Slot, short = false) => (slot === 'lunch' ? 'Lunch' : short ? `P${slot}` : `Period ${slot}`)

export const classLabel = (p: Pick<Period, 'year' | 'classNumber'>) => (p.year && p.classNumber ? `${p.year}-${p.classNumber}` : '')

/** Headline for a period: class label or the special type. */
export const periodTitle = (p: Period) => (p.kind === 'class' ? classLabel(p) : (p.specialType ?? 'Other'))

/** Secondary line: lesson plan title, else the summary. */
export function periodSubtitle(p: Period, plans: Map<string, LessonPlan>): string {
  const plan = p.lessonPlanId ? plans.get(p.lessonPlanId) : undefined
  return plan?.title || p.summary
}

/** Sort key so lunch sorts after the period it follows. */
export const slotOrder = (slot: Slot, lunchAfter = 4) => (slot === 'lunch' ? lunchAfter + 0.5 : slot)

/** Parse quick class entry like "5-1", "5 1" or "5/1". */
export function parseClass(text: string): { year: number; classNumber: number } | null {
  const m = /^\s*(\d{1,2})\s*[-/ .]\s*(\d{1,2})\s*$/.exec(text)
  if (!m) return null
  const year = Number(m[1])
  const classNumber = Number(m[2])
  return year > 0 && classNumber > 0 ? { year, classNumber } : null
}

/** The period most recently before (date, slot) for the same class, else same year. */
export function previousForClass(
  periods: Period[],
  target: { date: string; slot: Slot; year: number; classNumber: number },
  lunchAfter = 4,
): Period | null {
  const before = (p: Period) =>
    p.date < target.date || (p.date === target.date && slotOrder(p.slot, lunchAfter) < slotOrder(target.slot, lunchAfter))
  const candidates = periods
    .filter((p) => p.kind === 'class' && p.year === target.year && before(p) && (p.summary.trim() || p.lessonPlanId))
    .sort((a, b) => (a.date === b.date ? slotOrder(b.slot, lunchAfter) - slotOrder(a.slot, lunchAfter) : a.date < b.date ? 1 : -1))
  return candidates.find((p) => p.classNumber === target.classNumber) ?? candidates[0] ?? null
}

/** Readable text colour (black/white) for a background hex colour. */
export function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#1e2233' : '#ffffff'
}

/** Japanese school years start in April. */
export function schoolYearStart(today = new Date()) {
  const y = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1
  return new Date(y, 3, 1)
}

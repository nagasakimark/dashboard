import { useRef, useState } from 'react'
import { format, isToday } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import type { DayAssignment, LessonPlan, Period, School } from '@/data/schema'
import { periodId } from '@/data/schema'
import { cn } from '@/lib/cn'
import { daySlots, iso, slotTimes, timetableFor } from './model'
import { PeriodCellContent } from './PeriodCell'
import type { PeriodTarget } from './PeriodEditor'

interface Props {
  days: Date[]
  selected: Date
  onSelect: (d: Date) => void
  /** Swipe past the first/last day. */
  onShift: (dir: -1 | 1) => void
  dayMap: Map<string, DayAssignment>
  periods: Map<string, Period>
  schools: Map<string, School>
  plans: Map<string, LessonPlan>
  onEditPeriod: (t: PeriodTarget) => void
  onEditDay: (date: string) => void
}

/** Phone layout: a strip of days and the selected day's periods. */
export function AgendaView({ days, selected, onSelect, onShift, dayMap, periods, schools, plans, onEditPeriod, onEditDay }: Props) {
  const key = iso(selected)
  const day = dayMap.get(key)
  const school = day?.schoolId ? schools.get(day.schoolId) : undefined
  const timetable = timetableFor(school, day)
  const slots = daySlots(school)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const index = days.findIndex((d) => iso(d) === key)
  // Which way the day list slides in: from the right going forward, from the left going back.
  const [from, setFrom] = useState<'left' | 'right' | null>(null)
  const pick = (d: Date) => {
    setFrom(iso(d) > key ? 'right' : iso(d) < key ? 'left' : null)
    onSelect(d)
  }
  const go = (dir: -1 | 1) => {
    setFrom(dir > 0 ? 'right' : 'left')
    const next = days[index + dir]
    if (next) onSelect(next)
    else onShift(dir)
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const start = touch.current
        touch.current = null
        if (!start) return
        const dx = e.changedTouches[0].clientX - start.x
        const dy = e.changedTouches[0].clientY - start.y
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
      }}
    >
      <div
        role="tablist"
        aria-label="Days"
        className="mb-2 grid shrink-0 gap-1.5"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((d) => {
          const k = iso(d)
          const dSchool = schools.get(dayMap.get(k)?.schoolId ?? '')
          const on = k === key
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => pick(d)}
              className={cn(
                'flex flex-col items-center rounded-2xl py-1.5 transition-colors',
                on ? 'bg-accent text-white shadow-sm' : 'bg-surface text-ink',
                !on && isToday(d) && 'ring-2 ring-accent/40',
              )}
            >
              <span className={cn('text-[11px] font-semibold uppercase', on ? 'text-white/80' : 'text-ink-faint')}>{format(d, 'EEE')}</span>
              <span className="text-lg leading-tight font-bold">{format(d, 'd')}</span>
              <span
                className="mt-0.5 size-1.5 rounded-full"
                style={{ backgroundColor: dSchool?.color ?? (dayMap.get(k)?.kind === 'off' ? '#94a3b8' : 'transparent') }}
                aria-hidden
              />
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onEditDay(key)}
        className="mb-2 flex w-full shrink-0 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2 text-left shadow-card"
        style={school ? { backgroundColor: `color-mix(in oklab, ${school.color} 9%, white)` } : undefined}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-ink-faint uppercase">{format(selected, 'EEEE d MMMM')}</span>
          <span className="block truncate font-bold" style={{ color: school?.color }}>
            {school ? school.name : day?.kind === 'off' ? day.dayType : 'No school set'}
          </span>
          {day?.note && <span className="block truncate text-xs text-ink-soft italic">{day.note}</span>}
        </span>
        <ChevronRight size={18} className="text-ink-faint" aria-hidden />
      </button>

      {day?.kind === 'off' && !slots.some((s) => periods.has(periodId(key, s))) ? (
        <p key={key} className="grid flex-1 place-items-center rounded-2xl bg-surface p-6 text-center text-sm text-ink-soft">
          {day.dayType}: no classes.
        </p>
      ) : (
        // The periods share the rest of the screen; the list scrolls only if they can't fit.
        <ul
          key={key}
          className={cn(
            'flex min-h-0 flex-1 flex-col divide-y divide-line overflow-y-auto rounded-2xl border border-line bg-surface shadow-card',
            from === 'right' && 'animate-from-right',
            from === 'left' && 'animate-from-left',
          )}
        >
          {slots.map((slot) => (
            <li key={String(slot)} className={cn('flex min-h-16 flex-[1_1_0]', slot === 'lunch' && 'min-h-11 flex-[0.6_1_0] bg-warning/4')}>
              <button type="button" onClick={() => onEditPeriod({ date: key, slot })} className="group block w-full active:bg-canvas">
                <PeriodCellContent
                  slot={slot}
                  period={periods.get(periodId(key, slot))}
                  school={school}
                  plans={plans}
                  times={slotTimes(timetable, slot)}
                  className="px-4 py-2.5"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

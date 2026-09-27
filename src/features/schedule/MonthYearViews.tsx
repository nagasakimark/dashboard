import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import type { DayAssignment, Period, School } from '@/data/schema'
import { cn } from '@/lib/cn'
import { iso, isWeekend } from './model'

interface Common {
  dayMap: Map<string, DayAssignment>
  schools: Map<string, School>
  weekStartsOn: 0 | 1
  onPick: (d: Date) => void
}

const weekdayLabels = (weekStartsOn: 0 | 1, short = false) => {
  const base = short ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return weekStartsOn === 1 ? [...base.slice(1), base[0]] : base
}

function gridDays(month: Date, weekStartsOn: 0 | 1) {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn }),
  })
}

export function MonthView({ month, periods, ...c }: Common & { month: Date; periods: Period[] }) {
  const classCount = new Map<string, number>()
  for (const p of periods) if (p.kind === 'class' && p.slot !== 'lunch') classCount.set(p.date, (classCount.get(p.date) ?? 0) + 1)

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="grid grid-cols-7 border-b border-line bg-canvas text-center text-xs font-semibold tracking-wide text-ink-faint uppercase">
        {weekdayLabels(c.weekStartsOn).map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {gridDays(month, c.weekStartsOn).map((d) => {
          const k = iso(d)
          const day = c.dayMap.get(k)
          const school = day?.schoolId ? c.schools.get(day.schoolId) : undefined
          const inMonth = isSameMonth(d, month)
          const count = classCount.get(k) ?? 0
          return (
            <button
              key={k}
              type="button"
              onClick={() => c.onPick(d)}
              className={cn(
                'relative flex min-h-20 flex-col items-start gap-0.5 border-r border-b border-line p-1.5 text-left transition-colors hover:bg-canvas sm:min-h-24 sm:p-2 [&:nth-child(7n)]:border-r-0',
                !inMonth && 'bg-canvas [&>span:first-child]:font-normal [&>span:first-child]:text-ink-soft',
                isWeekend(d) && !day && 'bg-canvas/60',
              )}
              style={school ? { backgroundColor: `color-mix(in oklab, ${school.color} 13%, white)` } : undefined}
              aria-label={`${format(d, 'EEEE d MMMM')}${school ? `, ${school.name}` : day?.dayType ? `, ${day.dayType}` : ''}${count ? `, ${count} classes` : ''}`}
            >
              <span
                className={cn(
                  'grid size-6 place-items-center rounded-full text-sm font-semibold',
                  isToday(d) ? 'bg-accent text-white' : 'text-ink',
                )}
              >
                {format(d, 'd')}
              </span>
              {school && (
                <span
                  className="w-full truncate text-[11px] leading-tight font-semibold"
                  style={{ color: `color-mix(in oklab, ${school.color} 70%, black)` }}
                >
                  {school.name}
                </span>
              )}
              {day?.kind === 'off' && (
                <span className="w-full truncate text-[11px] leading-tight font-medium text-ink-soft">{day.dayType}</span>
              )}
              {count > 0 && (
                <span className="mt-auto text-[11px] text-ink-soft">
                  {count} class{count === 1 ? '' : 'es'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function YearView({ year, ...c }: Common & { year: number }) {
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1))
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((m) => (
        <section
          key={m.getMonth()}
          className="rounded-2xl border border-line bg-surface p-3 shadow-card"
          aria-label={format(m, 'MMMM yyyy')}
        >
          <button type="button" onClick={() => c.onPick(m)} className="mb-2 text-sm font-bold text-ink hover:text-accent">
            {format(m, 'MMMM')}
          </button>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-ink-faint">
            {weekdayLabels(c.weekStartsOn, true).map((d, i) => (
              <div key={i}>{d}</div>
            ))}
            {gridDays(m, c.weekStartsOn).map((d) => {
              const k = iso(d)
              if (!isSameMonth(d, m)) return <div key={k} />
              const day = c.dayMap.get(k)
              const school = day?.schoolId ? c.schools.get(day.schoolId) : undefined
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => c.onPick(d)}
                  title={school?.name ?? day?.dayType ?? undefined}
                  className={cn(
                    'aspect-square rounded-md text-[11px] font-medium transition-transform hover:scale-110',
                    isToday(d) && 'ring-2 ring-accent',
                    school
                      ? 'text-white'
                      : day?.kind === 'off'
                        ? 'bg-ink/10 text-ink-soft'
                        : isWeekend(d)
                          ? 'text-ink-faint/60'
                          : 'text-ink-soft hover:bg-canvas',
                  )}
                  style={school ? { backgroundColor: school.color } : undefined}
                >
                  {format(d, 'd')}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

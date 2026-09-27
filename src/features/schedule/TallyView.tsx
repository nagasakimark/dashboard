import { useMemo, useState } from 'react'
import { addDays, addWeeks, differenceInCalendarWeeks, format, startOfWeek, subWeeks } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Card, EmptyState, Field, Input, Spinner } from '@/components/ui'
import { db } from '@/data/db'
import type { School } from '@/data/schema'
import { fromIso, iso } from './model'
import { tallyKey, tallyWeeks, weeklyTally } from './tally'

const BORDER = '#94a3b8'
const mix = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, white)`
const dark = (color: string) => `color-mix(in oklab, ${color} 70%, black)`

function loadWeeks() {
  try {
    return Math.min(52, Math.max(1, Number(localStorage.getItem('tally:weeks')) || 4))
  } catch {
    return 4
  }
}

/** Lessons per class per week, laid out like the original ALT Planner tally. */
export function TallyView({ schools, weekStartsOn }: { schools: School[]; weekStartsOn: 0 | 1 }) {
  const today = new Date()
  const [weeksCount, setWeeksCountState] = useState(loadWeeks)
  const [start, setStart] = useState(() => startOfWeek(subWeeks(today, weeksCount - 1), { weekStartsOn }))
  const setWeeksCount = (n: number) => {
    const v = Math.min(52, Math.max(1, Math.round(n) || 1))
    setWeeksCountState(v)
    try {
      localStorage.setItem('tally:weeks', String(v))
    } catch {
      // Private mode: fine, it just isn't remembered.
    }
  }

  const weeks = useMemo(() => tallyWeeks(start, weeksCount, weekStartsOn), [start, weeksCount, weekStartsOn])
  const from = iso(weeks[0].start)
  const to = iso(addDays(weeks[weeks.length - 1].start, 6))
  const data = useLiveQuery(
    async () => ({
      periods: await db.periods.where('date').between(from, to, true, true).toArray(),
      days: await db.dayAssignments.where('date').between(from, to, true, true).toArray(),
    }),
    [from, to],
  )
  const tally = useMemo(() => (data ? weeklyTally({ ...data, schools, weeks }) : null), [data, schools, weeks])
  const thisWeek = iso(startOfWeek(today, { weekStartsOn }))

  const upToNow = () => setWeeksCount(differenceInCalendarWeeks(today, start, { weekStartsOn }) + 1)

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="flex gap-1.5">
          <Button icon={ChevronLeft} onClick={() => setStart((d) => subWeeks(d, weeksCount))}>
            Previous period
          </Button>
          <Button onClick={() => setStart((d) => addWeeks(d, weeksCount))}>
            Next period
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
        <Field label="Start week">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={from}
              onChange={(e) => e.target.value && setStart(startOfWeek(fromIso(e.target.value), { weekStartsOn }))}
              className="w-40"
            />
          )}
        </Field>
        <Field label="Weeks">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={1}
              max={52}
              value={weeksCount}
              onChange={(e) => setWeeksCount(Number(e.target.value))}
              className="w-20"
            />
          )}
        </Field>
        <Button variant="ghost" icon={CalendarClock} onClick={upToNow} disabled={start > today} title="Show every week up to this one">
          Up to now
        </Button>
        <p className="ml-auto self-center text-sm text-ink-soft">
          {format(weeks[0].first, 'd MMM yyyy')} – {format(weeks[weeks.length - 1].last, 'd MMM yyyy')}
        </p>
      </Card>

      {!tally ? (
        <div className="grid h-40 place-items-center">
          <Spinner />
        </div>
      ) : tally.groups.length === 0 ? (
        <Card>
          <EmptyState icon={BarChart3} title="No classes taught in these weeks" description="Try earlier weeks, or more of them." />
        </Card>
      ) : (
        <Card className="overflow-x-auto p-3 sm:p-4">
          <table className="w-full border-collapse text-sm text-ink" style={{ border: `2px solid ${BORDER}` }}>
            <caption className="sr-only">Lessons per class per week</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-px bg-surface px-3 py-2 text-left font-semibold whitespace-nowrap"
                  style={{ border: `2px solid ${BORDER}` }}
                >
                  School
                </th>
                {tally.groups.map(({ school, classes }) => (
                  <th
                    key={school.id}
                    scope="colgroup"
                    colSpan={classes.length}
                    className="px-2 py-2 font-bold whitespace-nowrap"
                    style={{ backgroundColor: mix(school.color, 20), color: dark(school.color), border: `2px solid ${BORDER}` }}
                  >
                    {school.name}
                  </th>
                ))}
              </tr>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 h-16 min-w-32 bg-surface p-0 text-xs font-semibold text-ink-soft"
                  style={{ border: `2px solid ${BORDER}` }}
                >
                  <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
                    <line x1="0" y1="0" x2="100" y2="100" stroke={BORDER} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <span className="absolute top-1.5 right-2">Class</span>
                  <span className="absolute bottom-1.5 left-2">Week</span>
                  <span className="sr-only">Week / Class</span>
                </th>
                {tally.groups.map(({ school, classes }) =>
                  classes.map((c, i) => (
                    <th
                      key={`${school.id}-${c}`}
                      scope="col"
                      className="min-w-9 px-1 py-2 font-bold"
                      style={{
                        backgroundColor: mix(school.color, 10),
                        borderBottom: `2px solid ${BORDER}`,
                        borderRight: i === classes.length - 1 ? `2px solid ${BORDER}` : '1px solid #cbd5e1',
                      }}
                    >
                      <span className="inline-block -rotate-90 whitespace-nowrap tabular-nums">{c}</span>
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {tally.rows.map(({ week, counts }) => {
                const current = iso(week.start) === thisWeek
                return (
                  <tr key={iso(week.start)}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-left font-medium whitespace-nowrap"
                      style={{ borderRight: `2px solid ${BORDER}`, borderBottom: '1px solid #cbd5e1' }}
                    >
                      {format(week.first, 'MMM d')} – {format(week.last, 'MMM d')}
                      {current && (
                        <span className="ml-2 rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-bold text-accent">Now</span>
                      )}
                    </th>
                    {tally.groups.map(({ school, classes }) =>
                      classes.map((c, i) => {
                        const n = counts.get(tallyKey(school.id, c)) ?? 0
                        return (
                          <td
                            key={`${school.id}-${c}`}
                            className={n ? 'h-9 text-center font-bold tabular-nums' : 'h-9 text-center text-ink-soft'}
                            style={{
                              backgroundColor: mix(school.color, n ? 22 : 7),
                              borderRight: i === classes.length - 1 ? `2px solid ${BORDER}` : '1px solid #cbd5e1',
                              borderBottom: '1px solid #cbd5e1',
                            }}
                          >
                            {n || '–'}
                          </td>
                        )
                      }),
                    )}
                  </tr>
                )
              })}
              <tr>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-bold"
                  style={{ borderTop: `2px solid ${BORDER}`, borderRight: `2px solid ${BORDER}` }}
                >
                  Total
                </th>
                {tally.groups.map(({ school, classes }) =>
                  classes.map((c, i) => (
                    <td
                      key={`${school.id}-${c}`}
                      className="h-10 text-center font-bold tabular-nums"
                      style={{
                        backgroundColor: mix(school.color, 32),
                        borderTop: `2px solid ${BORDER}`,
                        borderRight: i === classes.length - 1 ? `2px solid ${BORDER}` : '1px solid #cbd5e1',
                      }}
                    >
                      {tally.totals.get(tallyKey(school.id, c)) ?? 0}
                    </td>
                  )),
                )}
              </tr>
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

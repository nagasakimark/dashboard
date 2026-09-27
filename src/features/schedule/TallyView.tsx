import { useMemo, useState } from 'react'
import { addDays, format, startOfWeek, subWeeks } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, CalendarClock } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner } from '@/components/ui'
import { db } from '@/data/db'
import type { School } from '@/data/schema'
import { fromIso, iso, schoolYearStart } from './model'
import { classesByYear, computeTally } from './tally'

export function TallyView({ schools, weekStartsOn }: { schools: School[]; weekStartsOn: 0 | 1 }) {
  const today = new Date()
  const [from, setFrom] = useState(iso(startOfWeek(subWeeks(today, 3), { weekStartsOn })))
  const [to, setTo] = useState(iso(today))
  const [schoolId, setSchoolId] = useState('')

  const data = useLiveQuery(
    async () => ({
      periods: await db.periods.where('date').between(from, to, true, true).toArray(),
      days: await db.dayAssignments.where('date').between(from, to, true, true).toArray(),
    }),
    [from, to],
  )
  const tally = useMemo(
    () => (data ? computeTally({ ...data, schools, from, to, schoolId: schoolId || null }) : null),
    [data, schools, from, to, schoolId],
  )

  const presets: [string, () => void][] = [
    ['This week', () => (setFrom(iso(startOfWeek(today, { weekStartsOn }))), setTo(iso(addDays(startOfWeek(today, { weekStartsOn }), 6))))],
    ['Last 4 weeks', () => (setFrom(iso(startOfWeek(subWeeks(today, 3), { weekStartsOn }))), setTo(iso(today)))],
    ['This school year', () => (setFrom(iso(schoolYearStart(today))), setTo(iso(today)))],
    ['Up to now', () => setTo(iso(today))],
  ]

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Field label="From">
          {(id) => <Input id={id} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-40" />}
        </Field>
        <Field label="To">
          {(id) => <Input id={id} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-40" />}
        </Field>
        <Field label="School">
          {(id) => (
            <Select id={id} value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="w-48">
              <option value="">All schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {presets.map(([label, run]) => (
            <Button key={label} size="sm" variant="ghost" icon={label === 'Up to now' ? CalendarClock : undefined} onClick={run}>
              {label}
            </Button>
          ))}
        </div>
      </Card>

      {!tally ? (
        <div className="grid h-40 place-items-center">
          <Spinner />
        </div>
      ) : tally.schools.length === 0 && tally.activities.size === 0 ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="Nothing scheduled in this range"
            description={`${format(fromIso(from), 'd MMM yyyy')} to ${format(fromIso(to), 'd MMM yyyy')}`}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Lessons" value={tally.totalLessons} />
            <Stat label="School days" value={tally.schools.reduce((n, s) => n + s.days, 0)} />
            <Stat label="Lunches" value={tally.schools.reduce((n, s) => n + s.lunches, 0)} />
            <Stat label="Other activities" value={[...tally.activities.values()].reduce((a, b) => a + b, 0)} />
          </div>

          {tally.schools.map((t) => (
            <Card key={t.school.id} className="overflow-hidden">
              <div
                className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3"
                style={{ backgroundColor: `color-mix(in oklab, ${t.school.color} 8%, white)` }}
              >
                <span className="size-3 rounded-full" style={{ backgroundColor: t.school.color }} aria-hidden />
                <h3 className="font-semibold text-ink">{t.school.name}</h3>
                <span className="text-sm text-ink-soft">
                  {plural(t.lessons, 'lesson')} · {plural(t.days, 'day')}
                  {t.lunches ? ` · ${plural(t.lunches, 'lunch', 'lunches')}` : ''}
                </span>
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {[...t.byJte].map(([name, n]) => (
                    <Badge key={name}>
                      {name}: {n}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="text-sm">
                  <tbody>
                    {classesByYear(t).map(([year, list]) => (
                      <tr key={year}>
                        <th scope="row" className="pr-4 pb-2 text-left font-semibold whitespace-nowrap text-ink-soft">
                          Year {year}
                        </th>
                        {list.map((c) => (
                          <td key={c.classNumber} className="pr-2 pb-2">
                            <span className="inline-flex items-baseline gap-1.5 rounded-xl border border-line px-2.5 py-1">
                              <span className="font-bold" style={{ color: t.school.color }}>
                                {year}-{c.classNumber}
                              </span>
                              <span className="font-semibold tabular-nums">{c.count}</span>
                            </span>
                          </td>
                        ))}
                        <td className="pb-2 pl-2 text-xs whitespace-nowrap text-ink-faint">= {list.reduce((n, c) => n + c.count, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          {(tally.activities.size > 0 || tally.dayTypes.size > 0) && (
            <Card className="grid gap-4 p-5 sm:grid-cols-2">
              <CountList title="Other activities" entries={[...tally.activities]} />
              <CountList title="Days off & events" entries={[...tally.dayTypes]} />
            </Card>
          )}
          {tally.unassignedLessons > 0 && (
            <p className="text-sm text-ink-faint">
              {tally.unassignedLessons} lessons are on days without a school and aren’t counted above.
            </p>
          )}
        </>
      )}
    </div>
  )
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink tabular-nums">{value.toLocaleString()}</p>
    </Card>
  )
}

function CountList({ title, entries }: { title: string; entries: [string, number][] }) {
  if (!entries.length) return null
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      <ul className="space-y-1 text-sm">
        {entries
          .sort((a, b) => b[1] - a[1])
          .map(([k, n]) => (
            <li key={k} className="flex justify-between border-b border-line/60 py-1">
              <span className="text-ink-soft">{k}</span>
              <span className="font-semibold tabular-nums">{n}</span>
            </li>
          ))}
      </ul>
    </div>
  )
}

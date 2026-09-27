import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, differenceInMinutes, format, isToday, isTomorrow, startOfMonth } from 'date-fns'
import { BookOpen, CalendarDays, CalendarHeart, GraduationCap, Sparkles } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Badge, ButtonLink, Card, CardHeader, Select } from '@/components/ui'
import { db } from '@/data/db'
import type { DayAssignment, LessonPlan, Period, School } from '@/data/schema'
import { useSettings } from '@/data/settings'
import { useSchoolMap } from '@/features/schedule/hooks'
import {
  classLabel,
  fromIso,
  iso,
  periodSubtitle,
  periodTitle,
  schoolYearStart,
  slotLabel,
  slotOrder,
  weekDays,
} from '@/features/schedule/model'
import { current, upcoming, withTimes, type TimedPeriod } from '@/features/schedule/upcoming'
import { cn } from '@/lib/cn'
import { useIsDesktop } from '@/lib/useMediaQuery'
import { useNow } from '@/lib/useNow'
import { LegacyImportBanner } from './LegacyImportBanner'
import { TodoList } from './TodoList'

interface HomeData {
  periods: Period[]
  days: Map<string, DayAssignment>
  plans: Map<string, LessonPlan>
}

function greeting(date: Date) {
  const h = date.getHours()
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const when = (d: Date | null, date: string) => {
  const day = fromIso(date)
  const label = isToday(day) ? 'Today' : isTomorrow(day) ? 'Tomorrow' : format(day, 'EEEE d MMM')
  return d ? `${label}, ${format(d, 'H:mm')}` : label
}

export default function HomePage() {
  const now = useNow()
  const { settings } = useSettings()
  const schools = useSchoolMap()
  const desktop = useIsDesktop()
  const today = iso(now)
  const weekStart = iso(weekDays(now, settings.weekStartsOn, true)[0])
  const from = weekStart < today ? weekStart : today
  const to = iso(addDays(now, 28))

  const data = useLiveQuery(async (): Promise<HomeData> => {
    const [periods, days, plans] = await Promise.all([
      db.periods.where('date').between(from, to, true, true).toArray(),
      db.dayAssignments.where('date').between(from, to, true, true).toArray(),
      db.lessonPlans.toArray(),
    ])
    return { periods, days: new Map(days.map((d) => [d.date, d])), plans: new Map(plans.map((p) => [p.id, p])) }
  }, [from, to])

  const timed = useMemo(() => (data ? withTimes(data.periods, data.days, schools) : []), [data, schools])
  const nowPeriod = current(timed, now)
  const nextClass = upcoming(timed, now).find((t) => t !== nowPeriod) ?? null
  const name = settings.profileName.split(/\s+/)[0]

  return (
    <Page title={`${greeting(now)}${name ? `, ${name}` : ''}`} description={format(now, 'EEEE d MMMM')} width="wide" fill={desktop}>
      <LegacyImportBanner />
      <div className="grid gap-4 md:min-h-0 md:flex-1 md:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          {data && <NextClassCard t={nowPeriod ?? nextClass} live={!!nowPeriod} now={now} data={data} schools={schools} timed={timed} />}
        </div>
        <TaughtCard schools={schools} className="lg:col-span-4" />
        {data && (
          <WeekCard
            now={now}
            data={data}
            timed={timed}
            schools={schools}
            weekStartsOn={settings.weekStartsOn}
            className="min-h-0 lg:col-span-8"
          />
        )}
        <TodoList className="min-h-64 md:min-h-0 lg:col-span-4" />
      </div>
    </Page>
  )
}

/** The class on now (or next), with the rest of today's classes beside it. */
function NextClassCard({
  t,
  live,
  now,
  data,
  schools,
  timed,
}: {
  t: TimedPeriod | null
  live: boolean
  now: Date
  data: HomeData
  schools: Map<string, School>
  timed: TimedPeriod[]
}) {
  const today = iso(now)
  const todays = timed.filter((x) => x.period.date === today && (x.period.kind === 'class' || x.period.summary))
  const day = data.days.get(today)
  const todaySchool = day?.schoolId ? schools.get(day.schoolId) : undefined
  const plan = t?.period.lessonPlanId ? data.plans.get(t.period.lessonPlanId) : undefined
  const mins = t?.start ? differenceInMinutes(t.start, now) : null
  const school = t?.school

  return (
    <Card className="h-full overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: school?.color ?? 'var(--color-accent)' }} />
      <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        {t ? (
          <div className="flex min-w-0 flex-col">
            <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
              {live ? 'Happening now' : 'Next class'} · {when(t.start, t.period.date)}
              {!live && mins !== null && mins >= 0 && mins < 120 ? ` · in ${mins} min` : ''}
            </p>
            <p className="mt-1 text-4xl font-black tracking-tight" style={{ color: school?.color }}>
              {classLabel(t.period)} <span className="text-base font-semibold text-ink-soft">{school?.name}</span>
            </p>
            <p className="mt-1 line-clamp-2 text-ink">
              {plan?.title || t.period.summary || <span className="text-ink-faint">No plan yet</span>}
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {plan && (
                <ButtonLink to={`/lessons/${plan.id}`} icon={BookOpen} size="sm">
                  Open plan
                </ButtonLink>
              )}
              <ButtonLink to={`/schedule?v=week&d=${t.period.date}`} size="sm" variant="ghost">
                View week
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Sparkles size={24} aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-ink">No classes coming up</p>
              <p className="text-sm text-ink-soft">Nothing is scheduled for the next four weeks.</p>
              <ButtonLink to="/schedule" icon={CalendarDays} size="sm" className="mt-2">
                Plan your week
              </ButtonLink>
            </div>
          </div>
        )}
        <div className="min-w-0 rounded-2xl bg-canvas p-3">
          <p className="mb-1.5 flex items-baseline justify-between text-xs font-semibold tracking-wide text-ink-faint uppercase">
            Today
            <span className="truncate pl-2 normal-case" style={{ color: todaySchool?.color }}>
              {todaySchool?.name ?? (day?.kind === 'off' ? day.dayType : '')}
            </span>
          </p>
          {todays.length ? (
            <ul className="space-y-0.5">
              {todays.map((x) => {
                const on = x === (live ? t : null)
                const past = x.end ? x.end <= now : false
                return (
                  <li
                    key={x.period.id}
                    className={cn('flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm', on && 'bg-accent-soft', past && 'opacity-50')}
                  >
                    <span className="w-12 shrink-0 text-xs text-ink-faint tabular-nums">
                      {x.start ? format(x.start, 'H:mm') : slotLabel(x.period.slot, true)}
                    </span>
                    <span className="shrink-0 font-bold" style={{ color: x.period.kind === 'class' ? x.school?.color : undefined }}>
                      {periodTitle(x.period)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{periodSubtitle(x.period, data.plans)}</span>
                    {on && <Badge tone="accent">Now</Badge>}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">{day?.kind === 'off' ? 'Day off. Enjoy!' : 'No classes today.'}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

/** Classes taught so far (as the old planner counted them), filterable by school and year. */
function TaughtCard({ schools, className }: { schools: Map<string, School>; className?: string }) {
  const [schoolId, setSchoolId] = useState('')
  const [year, setYear] = useState('')
  const now = useNow(60_000)
  const today = iso(now)
  const counts = useLiveQuery(async () => {
    const [periods, days] = await Promise.all([
      db.periods.where('date').below(today).toArray(),
      db.dayAssignments.where('date').below(today).toArray(),
    ])
    const dayMap = new Map(days.map((d) => [d.date, d]))
    const yearStart = iso(schoolYearStart(now))
    const monthStart = iso(startOfMonth(now))
    let all = 0
    let sy = 0
    let month = 0
    for (const p of periods) {
      if (p.kind !== 'class' || p.slot === 'lunch' || !p.year || !p.classNumber) continue
      const d = dayMap.get(p.date)
      if (!d?.schoolId || (schoolId && d.schoolId !== schoolId) || (year && p.year !== Number(year))) continue
      all++
      if (p.date >= yearStart) sy++
      if (p.date >= monthStart) month++
    }
    return { all, sy, month }
  }, [today, schoolId, year])
  const years = [...new Set([...schools.values()].flatMap((s) => s.classes.map((c) => c.year)))].sort()

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader icon={GraduationCap} title="Classes taught" description="Up to yesterday" />
      <div className="flex flex-1 items-center gap-5 px-5">
        <span className="text-5xl font-black tracking-tighter text-accent tabular-nums">{counts?.all ?? '–'}</span>
        <dl className="space-y-0.5 text-sm">
          <div className="flex gap-2">
            <dt className="text-ink-soft">This school year</dt>
            <dd className="font-bold tabular-nums">{counts?.sy ?? '–'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft">This month</dt>
            <dd className="font-bold tabular-nums">{counts?.month ?? '–'}</dd>
          </div>
        </dl>
      </div>
      <div className="flex gap-2 p-4 pt-3">
        <Select aria-label="School" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="h-8 text-xs">
          <option value="">All schools</option>
          {[...schools.values()].map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)} className="h-8 text-xs">
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </Select>
      </div>
    </Card>
  )
}

/** This week's classes, day by day, plus upcoming days off and events. */
function WeekCard({
  now,
  data,
  timed,
  schools,
  weekStartsOn,
  className,
}: {
  now: Date
  data: HomeData
  timed: TimedPeriod[]
  schools: Map<string, School>
  weekStartsOn: 0 | 1
  className?: string
}) {
  const today = iso(now)
  const days = weekDays(now, weekStartsOn, false)
  const events = [...data.days.values()]
    .filter((d) => d.date >= today && (d.kind === 'off' || d.note))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        icon={CalendarDays}
        title="This week"
        actions={
          <ButtonLink to={`/schedule?v=week&d=${today}`} size="sm" variant="ghost">
            Open schedule
          </ButtonLink>
        }
      />
      <div className="grid min-h-0 flex-1 grid-cols-5 gap-2 px-5">
        {days.map((d) => {
          const k = iso(d)
          const day = data.days.get(k)
          const school = day?.schoolId ? schools.get(day.schoolId) : undefined
          const classes = timed
            .filter((x) => x.period.date === k && x.period.kind === 'class')
            .sort((a, b) => slotOrder(a.period.slot, school?.lunchAfter) - slotOrder(b.period.slot, school?.lunchAfter))
          return (
            <Link
              key={k}
              to={`/schedule?v=week&d=${k}`}
              className={cn(
                'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border p-2 transition-[filter] hover:brightness-[0.98]',
                isToday(d) ? 'border-accent ring-2 ring-accent/20' : 'border-line',
              )}
              style={school ? { backgroundColor: `color-mix(in oklab, ${school.color} 9%, white)` } : undefined}
            >
              <span className="text-[11px] font-semibold text-ink-faint uppercase">
                {format(d, 'EEE')} <span className="text-ink">{format(d, 'd')}</span>
              </span>
              <span className="truncate text-xs font-semibold" style={{ color: school?.color }}>
                {school?.name ?? (day?.kind === 'off' ? day.dayType : '—')}
              </span>
              <ul className="mt-1 min-h-0 space-y-0.5 overflow-hidden text-xs">
                {classes.map((x) => (
                  <li key={x.period.id} className="leading-tight">
                    <span className="flex gap-1.5">
                      <span className="text-ink-faint">{slotLabel(x.period.slot, true)}</span>
                      <span className="font-bold" style={{ color: school?.color }}>
                        {classLabel(x.period)}
                      </span>
                    </span>
                    {periodSubtitle(x.period, data.plans) && (
                      <span className="block truncate text-[11px] text-ink-soft">{periodSubtitle(x.period, data.plans)}</span>
                    )}
                  </li>
                ))}
              </ul>
              {classes.length > 0 && (
                <span className="mt-auto pt-1 text-[11px] text-ink-soft">
                  {(() => {
                    const n = classes.filter((x) => x.period.slot !== 'lunch').length
                    return `${n} ${n === 1 ? 'class' : 'classes'}`
                  })()}
                </span>
              )}
            </Link>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 text-xs">
        <CalendarHeart size={15} className="text-ink-faint" aria-hidden />
        {events.length ? (
          events.map((e) => (
            <span key={e.date} className="rounded-full bg-canvas px-2.5 py-1">
              <span className="font-semibold">{format(fromIso(e.date), 'EEE d MMM')}</span> · {e.kind === 'off' ? e.dayType : e.note}
            </span>
          ))
        ) : (
          <span className="text-ink-faint">No days off or events in the next four weeks.</span>
        )}
      </div>
    </Card>
  )
}

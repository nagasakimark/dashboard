import { useMemo } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, differenceInMinutes, format, isToday, isTomorrow } from 'date-fns'
import { ArrowRight, BookOpen, CalendarDays, Clock, ListChecks, NotebookPen, Presentation, Sparkles, type LucideIcon } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Badge, ButtonLink, Card, CardHeader } from '@/components/ui'
import { db } from '@/data/db'
import {
  classKey,
  type Curriculum,
  type CurriculumItem,
  type DayAssignment,
  type LessonPlan,
  type Period,
  type School,
} from '@/data/schema'
import { useSettings } from '@/data/settings'
import { classPosition, progressIndex, trackedClasses } from '@/features/curriculum/model'
import { useSchoolMap } from '@/features/schedule/hooks'
import { classLabel, fromIso, iso, periodSubtitle, periodTitle, slotLabel, weekDays } from '@/features/schedule/model'
import { current, daySchedule, upcoming, withTimes, type TimedPeriod } from '@/features/schedule/upcoming'
import { cn } from '@/lib/cn'
import { useNow } from '@/lib/useNow'
import { LegacyImportBanner } from './LegacyImportBanner'
import { TodoList } from './TodoList'

interface HomeData {
  periods: Period[]
  days: Map<string, DayAssignment>
  plans: Map<string, LessonPlan>
  curricula: Curriculum[]
  items: CurriculumItem[]
  index: Map<string, Set<string>>
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

/** First unfinished curriculum item for a class, across its curricula. */
function nextCurriculumItem(d: HomeData, schools: School[], key: string): string | null {
  for (const c of d.curricula) {
    if (!trackedClasses(c, schools).some((t) => t.key === key)) continue
    const items = d.items.filter((i) => i.curriculumId === c.id).sort((a, b) => a.order - b.order)
    const next = classPosition(items, d.index, key).next
    if (next) return next.text
  }
  return null
}

export default function HomePage() {
  const now = useNow()
  const { settings } = useSettings()
  const schools = useSchoolMap()
  const today = iso(now)
  const weekStart = iso(weekDays(now, settings.weekStartsOn, true)[0])
  const from = weekStart < today ? weekStart : today
  const to = iso(addDays(now, 21))

  const data = useLiveQuery(async (): Promise<HomeData> => {
    const [periods, days, plans, curricula, items, progress] = await Promise.all([
      db.periods.where('date').between(from, to, true, true).toArray(),
      db.dayAssignments.where('date').between(from, to, true, true).toArray(),
      db.lessonPlans.toArray(),
      db.curricula.toArray(),
      db.curriculumItems.toArray(),
      db.classProgress.toArray(),
    ])
    return {
      periods,
      days: new Map(days.map((d) => [d.date, d])),
      plans: new Map(plans.map((p) => [p.id, p])),
      curricula,
      items,
      index: progressIndex(progress),
    }
  }, [from, to])

  const timed = useMemo(() => (data ? withTimes(data.periods, data.days, schools) : []), [data, schools])
  const nowPeriod = current(timed, now)
  const nextClass = upcoming(timed, now).find((t) => t !== nowPeriod) ?? null
  const name = settings.profileName.split(/\s+/)[0]

  return (
    <Page title={`${greeting(now)}${name ? `, ${name}` : ''}`} description={format(now, 'EEEE d MMMM')} width="wide">
      <LegacyImportBanner />
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          {data &&
            (nowPeriod || nextClass ? (
              <NextClassCard t={(nowPeriod ?? nextClass)!} live={!!nowPeriod} now={now} data={data} schools={schools} />
            ) : (
              <Card className="flex flex-wrap items-center gap-4 p-5">
                <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Sparkles size={24} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">No classes coming up</p>
                  <p className="text-sm text-ink-soft">Nothing is scheduled for the next three weeks.</p>
                </div>
                <ButtonLink to="/schedule" icon={CalendarDays}>
                  Plan your week
                </ButtonLink>
              </Card>
            ))}
          {data && <TodayCard today={today} now={now} data={data} schools={schools} />}
          {data && <WeekGlance now={now} data={data} schools={schools} weekStartsOn={settings.weekStartsOn} />}
        </div>

        <div className="space-y-5">
          <TodoList />
          {data && <CurriculumHighlights data={data} schools={schools} />}
          <div className="grid grid-cols-2 gap-3">
            <QuickLink to="/board" icon={Presentation} label="Classroom board" tint="from-indigo-500 to-cyan-500" />
            <QuickLink to="/lessons" icon={NotebookPen} label="Lesson plans" tint="from-amber-500 to-orange-500" />
          </div>
        </div>
      </div>
    </Page>
  )
}

function NextClassCard({
  t,
  live,
  now,
  data,
  schools,
}: {
  t: TimedPeriod
  live: boolean
  now: Date
  data: HomeData
  schools: Map<string, School>
}) {
  const { period, school } = t
  const plan = period.lessonPlanId ? data.plans.get(period.lessonPlanId) : undefined
  const key = school && period.year && period.classNumber ? classKey(school.id, period.year, period.classNumber) : null
  const nextItem = key ? nextCurriculumItem(data, [...schools.values()], key) : null
  const mins = t.start ? differenceInMinutes(t.start, now) : null
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: school?.color ?? 'var(--color-accent)' }} />
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
            {live ? 'Happening now' : 'Next class'} · {when(t.start, period.date)}
            {!live && mins !== null && mins >= 0 && mins < 120 ? ` · in ${mins} min` : ''}
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight" style={{ color: school?.color }}>
            {classLabel(period)} <span className="text-base font-semibold text-ink-soft">{school?.name}</span>
          </p>
          <p className="mt-1 text-ink">{plan?.title || period.summary || <span className="text-ink-faint">No plan yet</span>}</p>
          {nextItem && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
              <ListChecks size={15} className="shrink-0 text-accent" aria-hidden /> Curriculum next:{' '}
              <span className="font-medium text-ink">{nextItem}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {plan && (
            <ButtonLink to={`/lessons/${plan.id}`} icon={BookOpen}>
              Open plan
            </ButtonLink>
          )}
          <ButtonLink to={`/schedule?v=week&d=${period.date}`} variant={plan ? 'ghost' : 'secondary'}>
            View day
          </ButtonLink>
        </div>
      </div>
    </Card>
  )
}

function TodayCard({ today, now, data, schools }: { today: string; now: Date; data: HomeData; schools: Map<string, School> }) {
  const day = data.days.get(today)
  const school = day?.schoolId ? schools.get(day.schoolId) : undefined
  const periods = useMemo(() => new Map(data.periods.map((p) => [p.id, p])), [data.periods])
  return (
    <Card>
      <CardHeader
        icon={Clock}
        title="Today"
        description={school ? school.name : day?.kind === 'off' ? day.dayType : 'No school set'}
        actions={
          <ButtonLink to={`/schedule?v=week&d=${today}`} size="sm" variant="ghost" iconRight={ArrowRight}>
            Week
          </ButtonLink>
        }
      />
      {day?.kind === 'off' ? (
        <p className="px-5 pb-5 text-sm text-ink-soft">Enjoy the day off!</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {daySchedule(today, day, school, periods).map(({ slot, period, start, end, times }) => {
            const live = !!(start && end && start <= now && now < end)
            const past = end ? end <= now : false
            return (
              <li
                key={String(slot)}
                className={cn('flex items-center gap-3 px-5 py-2.5', live && 'bg-accent-soft/60', past && 'opacity-50')}
              >
                <span className="w-20 shrink-0 text-xs text-ink-faint tabular-nums">
                  <span className="block font-semibold text-ink-soft">{slotLabel(slot, true)}</span>
                  {times ? `${times.start}–${times.end}` : ''}
                </span>
                {period ? (
                  <span className="min-w-0 flex-1">
                    <span className="font-bold" style={{ color: period.kind === 'class' ? school?.color : undefined }}>
                      {periodTitle(period)}
                    </span>
                    <span className="block truncate text-sm text-ink-soft">{periodSubtitle(period, data.plans)}</span>
                  </span>
                ) : (
                  <span className="flex-1 text-sm text-ink-faint">Free</span>
                )}
                {live && <Badge tone="accent">Now</Badge>}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function WeekGlance({
  now,
  data,
  schools,
  weekStartsOn,
}: {
  now: Date
  data: HomeData
  schools: Map<string, School>
  weekStartsOn: 0 | 1
}) {
  return (
    <Card>
      <CardHeader icon={CalendarDays} title="This week" />
      <div className="grid grid-cols-5 gap-2 px-5 pb-5">
        {weekDays(now, weekStartsOn, false).map((d) => {
          const k = iso(d)
          const day = data.days.get(k)
          const school = day?.schoolId ? schools.get(day.schoolId) : undefined
          const count = data.periods.filter((p) => p.date === k && p.kind === 'class' && p.slot !== 'lunch').length
          return (
            <Link
              key={k}
              to={`/schedule?v=week&d=${k}`}
              className={cn(
                'min-w-0 rounded-2xl border p-2 text-center transition-colors hover:bg-canvas',
                isToday(d) ? 'border-accent ring-2 ring-accent/20' : 'border-line',
              )}
              style={school ? { backgroundColor: `color-mix(in oklab, ${school.color} 10%, white)` } : undefined}
            >
              <span className="block text-[11px] font-semibold text-ink-faint uppercase">{format(d, 'EEE')}</span>
              <span className="block text-lg font-bold text-ink">{format(d, 'd')}</span>
              <span className="block truncate text-[11px] font-semibold" style={{ color: school?.color }}>
                {school?.name ?? (day?.kind === 'off' ? day.dayType : '—')}
              </span>
              {count > 0 && (
                <span className="block text-[11px] text-ink-faint">
                  {count} {count === 1 ? 'class' : 'classes'}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

function CurriculumHighlights({ data, schools }: { data: HomeData; schools: Map<string, School> }) {
  if (!data.curricula.length) return null
  const list = [...schools.values()]
  return (
    <Card>
      <CardHeader
        icon={ListChecks}
        title="Curriculum"
        actions={
          <ButtonLink to="/curriculum" size="sm" variant="ghost" iconRight={ArrowRight}>
            All
          </ButtonLink>
        }
      />
      <ul className="space-y-3 px-5 pb-5">
        {data.curricula.slice(0, 4).map((c) => {
          const items = data.items.filter((i) => i.curriculumId === c.id)
          const classes = trackedClasses(c, list)
          const pct = classes.length
            ? classes.reduce((n, cl) => n + classPosition(items, data.index, cl.key).done, 0) / (classes.length * Math.max(1, items.length))
            : items.filter((i) => i.completed).length / Math.max(1, items.length)
          return (
            <li key={c.id}>
              <Link to={`/curriculum/${c.id}`} className="block rounded-xl hover:bg-canvas">
                <span className="flex justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-ink">{c.name}</span>
                  <span className="text-ink-faint tabular-nums">{Math.round(pct * 100)}%</span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink/8">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${pct * 100}%` }} />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function QuickLink({ to, icon: Icon, label, tint }: { to: string; icon: LucideIcon; label: string; tint: string }) {
  return (
    <Link to={to} className="group">
      <Card className="flex flex-col items-start gap-3 p-4 transition-[box-shadow,transform] group-hover:-translate-y-0.5 group-hover:shadow-pop">
        <span className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br text-white ${tint}`}>
          <Icon size={20} aria-hidden />
        </span>
        <span className="text-sm font-semibold text-ink">{label}</span>
      </Card>
    </Link>
  )
}

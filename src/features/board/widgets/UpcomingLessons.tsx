import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { addDays, format, isToday, isTomorrow } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays } from 'lucide-react'
import { Badge, Button, Switch } from '@/components/ui'
import { db } from '@/data/db'
import { fromIso, iso, periodSubtitle, periodTitle, slotLabel } from '@/features/schedule/model'
import { current, upcoming, withTimes } from '@/features/schedule/upcoming'
import { useNow } from '@/lib/useNow'
import { useBoardContext } from '../context'
import type { WidgetProps } from '../types'
import type { UpcomingConfig } from './configs'
import { Setting, SettingsView, Stepper, WidgetEmpty } from './controls'

const dayLabel = (date: string) => {
  const d = fromIso(date)
  return isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'EEE d MMM')
}

export default function UpcomingLessons({ config, update, settings, closeSettings }: WidgetProps<UpcomingConfig>) {
  const now = useNow()
  const navigate = useNavigate()
  const { schools } = useBoardContext()
  const today = iso(now)
  const to = iso(addDays(now, 42))
  const data = useLiveQuery(async () => {
    const [periods, days, plans] = await Promise.all([
      db.periods.where('date').between(today, to, true, true).toArray(),
      db.dayAssignments.where('date').between(today, to, true, true).toArray(),
      db.lessonPlans.toArray(),
    ])
    return { periods, days: new Map(days.map((d) => [d.date, d])), plans: new Map(plans.map((p) => [p.id, p])) }
  }, [today, to])
  const schoolMap = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools])
  const timed = useMemo(() => (data ? withTimes(data.periods, data.days, schoolMap) : []), [data, schoolMap])

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Setting label="Lessons to show">
          <Stepper label="Lessons to show" value={config.count} min={3} max={8} onChange={(count) => update({ count })} />
        </Setting>
        <Switch label="Show lesson summary" checked={config.showSummary} onChange={(showSummary) => update({ showSummary })} />
        <Switch
          label="Include planning, marking and events"
          checked={config.includeSpecial}
          onChange={(includeSpecial) => update({ includeSpecial })}
        />
      </SettingsView>
    )

  if (!data) return null
  const live = current(timed, now)
  const list = upcoming(timed, now, { includeSpecial: config.includeSpecial }).slice(0, config.count)

  if (!list.length)
    return (
      <WidgetEmpty
        action={
          <Button size="sm" icon={CalendarDays} onClick={() => navigate('/schedule')}>
            Open schedule
          </Button>
        }
      >
        No lessons planned in the next six weeks.
      </WidgetEmpty>
    )

  return (
    <ul className="h-full space-y-1 overflow-y-auto p-2">
      {list.map((t) => {
        const p = t.period
        const title = periodTitle(p)
        const sub = periodSubtitle(p, data.plans)
        const isNow = t === live
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => navigate(`/schedule?d=${p.date}`)}
              className="flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-canvas"
            >
              <span className="w-[4.5rem] shrink-0 pt-0.5 text-xs leading-tight">
                <span className={isNow ? 'font-bold text-success' : 'font-semibold text-ink'}>{isNow ? 'Now' : dayLabel(p.date)}</span>
                <span className="block text-ink-faint">
                  {t.start ? format(t.start, 'H:mm') : slotLabel(p.slot, true)}
                  {t.start && ` · ${slotLabel(p.slot, true)}`}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  {p.kind === 'class' ? <Badge color={t.school?.color}>{title}</Badge> : <Badge>{title}</Badge>}
                  <span className="truncate text-xs text-ink-faint">{t.school?.name}</span>
                </span>
                {config.showSummary && sub && <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-ink">{sub}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

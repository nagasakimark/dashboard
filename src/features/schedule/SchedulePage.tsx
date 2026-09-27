import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isValid,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Grid3x3,
  MoreVertical,
  Rows3,
  BarChart3,
  School as SchoolIcon,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button, Card, EmptyState, IconButton, Menu, Spinner, Tabs, useFeedback, ButtonLink } from '@/components/ui'
import { useSettings } from '@/data/settings'
import { useIsDesktop } from '@/lib/useMediaQuery'
import { copyDay, type Undo } from './actions'
import { AgendaView } from './AgendaView'
import { DayEditor } from './DayEditor'
import { useLessonPlanMap, useScheduleRange, useSchools } from './hooks'
import { fromIso, iso, isWeekend, weekDays } from './model'
import { MonthView, YearView } from './MonthYearViews'
import { PeriodEditor, type PeriodTarget } from './PeriodEditor'
import { TallyView } from './TallyView'
import { WeekView } from './WeekView'

const ReportDialog = lazy(() => import('./report/ReportDialog'))

type View = 'week' | 'month' | 'year' | 'tally'
const VIEWS: View[] = ['week', 'month', 'year', 'tally']
const VIEW_LABELS: Record<View, string> = { week: 'Week', month: 'Month', year: 'Year', tally: 'Tally' }
const VIEW_ICONS = { week: Rows3, month: CalendarDays, year: Grid3x3, tally: BarChart3 }

/** "6–10 Jan", or "30 Jun – 4 Jul" across months (phones). */
const weekTitleShort = (a: Date, b: Date) =>
  a.getMonth() === b.getMonth() ? `${format(a, 'd')}–${format(b, 'd MMM')}` : `${format(a, 'd MMM')} – ${format(b, 'd MMM')}`

export default function SchedulePage() {
  const [params, setParams] = useSearchParams()
  const { settings } = useSettings()
  const { toast } = useFeedback()
  const isDesktop = useIsDesktop()
  const weekStartsOn = settings.weekStartsOn

  const view: View = VIEWS.includes(params.get('v') as View) ? (params.get('v') as View) : 'week'
  const dParam = params.get('d')
  const anchor = useMemo(() => {
    const parsed = dParam ? fromIso(dParam) : new Date()
    return isValid(parsed) ? parsed : new Date()
  }, [dParam])
  const go = (next: { v?: View; d?: Date }) =>
    setParams(
      (p) => {
        if (next.v) p.set('v', next.v)
        if (next.d) p.set('d', iso(next.d))
        return p
      },
      { replace: !next.v },
    )

  // Range to load for the current view.
  const [from, to] = useMemo(() => {
    if (view === 'year') return [iso(startOfYear(anchor)), iso(endOfYear(anchor))]
    if (view === 'month')
      return [iso(startOfWeek(startOfMonth(anchor), { weekStartsOn })), iso(endOfWeek(endOfMonth(anchor), { weekStartsOn }))]
    return [iso(startOfWeek(anchor, { weekStartsOn })), iso(endOfWeek(anchor, { weekStartsOn }))]
  }, [view, anchor, weekStartsOn])

  const schools = useSchools()
  const schoolMap = useMemo(() => new Map((schools ?? []).map((s) => [s.id, s])), [schools])
  const range = useScheduleRange(from, to)
  const plans = useLessonPlanMap()

  const [periodTarget, setPeriodTarget] = useState<PeriodTarget | null>(null)
  const [dayTarget, setDayTarget] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  const onUndoable = (message: string, undo: Undo) =>
    toast(message, {
      tone: 'success',
      action: {
        label: 'Undo',
        onClick: async () => {
          await undo()
          toast('Undone.')
        },
      },
    })

  // Show the weekend only when something is scheduled on it.
  const days = useMemo(() => {
    const all = weekDays(anchor, weekStartsOn, true)
    const used = (d: Date) => range?.days.has(iso(d)) || range?.periodList.some((p) => p.date === iso(d))
    return all.filter((d) => !isWeekend(d) || used(d))
  }, [anchor, weekStartsOn, range])

  const step = (dir: -1 | 1) => {
    if (view === 'year') go({ d: addYears(anchor, dir) })
    else if (view === 'month') go({ d: addMonths(anchor, dir) })
    else if (view === 'week') go({ d: isDesktop ? addWeeks(anchor, dir) : addDays(anchor, dir * 7) })
  }

  const title =
    view === 'year'
      ? format(anchor, 'yyyy')
      : view === 'month'
        ? format(anchor, 'MMMM yyyy')
        : view === 'week'
          ? isDesktop
            ? `${format(days[0] ?? anchor, 'd MMM')} – ${format(days[days.length - 1] ?? anchor, 'd MMM yyyy')}`
            : weekTitleShort(days[0] ?? anchor, days[days.length - 1] ?? anchor)
          : 'Tally'

  const copyWeek = async () => {
    const undos: Undo[] = []
    for (const d of weekDays(anchor, weekStartsOn, true)) {
      if (range?.days.has(iso(d)) || range?.periodList.some((p) => p.date === iso(d))) undos.push(await copyDay(iso(d), iso(addDays(d, 7))))
    }
    if (!undos.length) return toast('Nothing to copy this week.')
    onUndoable('Week copied to next week (classes only, without notes).', async () => {
      for (const u of undos.reverse()) await u()
    })
  }

  const loading = !schools || !range

  const tabs = (
    <Tabs<View>
      value={view}
      onChange={(v) => go({ v })}
      label="Schedule view"
      items={[...VIEWS.map((id) => ({ id, label: VIEW_LABELS[id], icon: VIEW_ICONS[id] }))]}
    />
  )

  return (
    <Page
      width="full"
      title={title}
      fill={view === 'tally' ? false : isDesktop ? true : view === 'week' ? 'always' : false}
      tools={tabs}
      actions={
        <>
          {view !== 'tally' && (
            <div className="flex items-center gap-1">
              {(!isDesktop || view !== 'week') && <IconButton icon={ChevronLeft} label="Previous" onClick={() => step(-1)} />}
              <Button size="sm" onClick={() => go({ d: new Date() })}>
                Today
              </Button>
              {(!isDesktop || view !== 'week') && <IconButton icon={ChevronRight} label="Next" onClick={() => step(1)} />}
            </div>
          )}
          {/* Phones: the view switch lives in the header instead of a row of tabs. */}
          <span className="contents md:hidden">
            <Menu
              trigger={(p) => <IconButton {...p} icon={VIEW_ICONS[view]} label={`View: ${VIEW_LABELS[view]}`} />}
              items={VIEWS.map((v) => ({
                label: v === view ? `${VIEW_LABELS[v]} ✓` : VIEW_LABELS[v],
                icon: VIEW_ICONS[v],
                onSelect: () => go({ v }),
              }))}
            />
          </span>
          <span className="hidden sm:contents">
            <Button icon={FileText} onClick={() => setReportOpen(true)}>
              PDF report
            </Button>
          </span>
          <Menu
            trigger={(p) => <IconButton {...p} icon={MoreVertical} label="More schedule actions" />}
            items={[
              { label: 'Copy this week to next week', icon: Copy, onSelect: copyWeek, disabled: view !== 'week' },
              { label: 'PDF report', icon: FileText, onSelect: () => setReportOpen(true) },
            ]}
          />
        </>
      }
    >
      {loading ? (
        <div className="grid h-64 place-items-center">
          <Spinner />
        </div>
      ) : schools.length === 0 ? (
        <Card>
          <EmptyState
            icon={SchoolIcon}
            title="Add a school to start planning"
            description="Schools hold your classes and timetables. Once you’ve added one, assign it to days here."
            action={
              <ButtonLink to="/schools" variant="primary">
                Go to Schools
              </ButtonLink>
            }
          />
        </Card>
      ) : view === 'week' ? (
        isDesktop ? (
          // The arrows fill the whole margin on each side, from the sidebar and the window edge.
          <div className="-mx-4 flex min-h-0 flex-1 sm:-mx-6 md:-my-3">
            <WeekArrow dir={-1} onClick={() => step(-1)} />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col py-3">
              <WeekView
                days={days}
                dayMap={range.days}
                periods={range.periods}
                schools={schoolMap}
                plans={plans}
                onEditPeriod={setPeriodTarget}
                onEditDay={setDayTarget}
                onUndoable={onUndoable}
              />
            </div>
            <WeekArrow dir={1} onClick={() => step(1)} />
          </div>
        ) : (
          <AgendaView
            days={weekDays(anchor, weekStartsOn, days.some(isWeekend))}
            selected={anchor}
            onSelect={(d) => go({ d })}
            onShift={(dir) => go({ d: addDays(anchor, dir) })}
            dayMap={range.days}
            periods={range.periods}
            schools={schoolMap}
            plans={plans}
            onEditPeriod={setPeriodTarget}
            onEditDay={setDayTarget}
          />
        )
      ) : view === 'month' ? (
        <MonthView
          month={anchor}
          periods={range.periodList}
          dayMap={range.days}
          schools={schoolMap}
          weekStartsOn={weekStartsOn}
          onPick={(d) => go({ v: 'week', d })}
        />
      ) : view === 'year' ? (
        <YearView
          year={anchor.getFullYear()}
          dayMap={range.days}
          schools={schoolMap}
          weekStartsOn={weekStartsOn}
          onPick={(d) => go({ v: d.getDate() === 1 ? 'month' : 'week', d })}
        />
      ) : (
        <TallyView schools={schools} weekStartsOn={weekStartsOn} />
      )}

      {range && (
        <>
          <PeriodEditor
            target={periodTarget}
            onClose={() => setPeriodTarget(null)}
            period={periodTarget ? range.periods.get(`${periodTarget.date}:${periodTarget.slot}`) : undefined}
            day={periodTarget ? range.days.get(periodTarget.date) : undefined}
            school={periodTarget ? schoolMap.get(range.days.get(periodTarget.date)?.schoolId ?? '') : undefined}
            onUndoable={onUndoable}
          />
          <DayEditor
            date={dayTarget}
            day={dayTarget ? range.days.get(dayTarget) : undefined}
            schools={schools ?? []}
            periodCount={dayTarget ? range.periodList.filter((p) => p.date === dayTarget).length : 0}
            onClose={() => setDayTarget(null)}
            onUndoable={onUndoable}
          />
        </>
      )}
      {reportOpen && (
        <Suspense fallback={null}>
          <ReportDialog onClose={() => setReportOpen(false)} schools={schools ?? []} />
        </Suspense>
      )}
    </Page>
  )
}

/** Full-height previous/next week strip beside the week grid. */
function WeekArrow({ dir, onClick }: { dir: -1 | 1; onClick: () => void }) {
  const Icon = dir < 0 ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir < 0 ? 'Previous week' : 'Next week'}
      title={dir < 0 ? 'Previous week' : 'Next week'}
      className="group grid w-11 shrink-0 cursor-pointer place-items-center text-ink-faint transition-colors hover:bg-accent-soft/70 hover:text-accent active:bg-accent-muted xl:w-14"
    >
      <Icon size={28} aria-hidden className="transition-transform group-hover:scale-110" />
    </button>
  )
}

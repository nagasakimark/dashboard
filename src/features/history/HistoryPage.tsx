import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { Download, History, Search } from 'lucide-react'
import { htmlToText } from '@/components/editor/richText'
import { Page } from '@/components/layout/Page'
import { Button, Card, EmptyState, Input, Select, Spinner, Switch, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { downloadText } from '@/data/transfer'
import type { Period } from '@/data/schema'
import type { Undo } from '@/features/schedule/actions'
import { useSchoolMap } from '@/features/schedule/hooks'
import { classLabel, fromIso, slotLabel, slotOrder } from '@/features/schedule/model'
import { PeriodEditor, type PeriodTarget } from '@/features/schedule/PeriodEditor'

const PAGE = 150
/** Byte-order mark so Excel opens the CSV as UTF-8. */
const BOM = String.fromCharCode(0xfeff)

export default function HistoryPage() {
  const { toast } = useFeedback()
  const schools = useSchoolMap()
  const data = useLiveQuery(async () => {
    const [periods, days, plans] = await Promise.all([db.periods.toArray(), db.dayAssignments.toArray(), db.lessonPlans.toArray()])
    return {
      periods: periods.filter((p) => p.kind === 'class'),
      days: new Map(days.map((d) => [d.date, d])),
      plans: new Map(plans.map((p) => [p.id, { title: p.title, text: htmlToText(p.content) }])),
    }
  }, [])
  const [q, setQ] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [year, setYear] = useState('')
  const [cls, setCls] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [lunch, setLunch] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const [editing, setEditing] = useState<PeriodTarget | null>(null)

  const rows = useMemo(() => {
    if (!data) return []
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return data.periods
      .map((p) => {
        const day = data.days.get(p.date)
        const school = day?.schoolId ? schools.get(day.schoolId) : undefined
        const plan = p.lessonPlanId ? data.plans.get(p.lessonPlanId) : undefined
        return { p, day, school, plan }
      })
      .filter(({ p, school, plan }) => {
        if (!lunch && p.slot === 'lunch') return false
        if (schoolId && school?.id !== schoolId) return false
        if (year && String(p.year) !== year) return false
        if (cls && String(p.classNumber) !== cls) return false
        if (from && p.date < from) return false
        if (to && p.date > to) return false
        if (!words.length) return true
        const hay = `${p.summary} ${plan?.title ?? ''} ${plan?.text ?? ''} ${classLabel(p)} ${p.date}`.toLowerCase()
        return words.every((w) => hay.includes(w))
      })
      .sort((a, b) =>
        a.p.date === b.p.date
          ? slotOrder(b.p.slot, b.school?.lunchAfter) - slotOrder(a.p.slot, a.school?.lunchAfter)
          : a.p.date < b.p.date
            ? 1
            : -1,
      )
  }, [data, schools, q, schoolId, year, cls, from, to, lunch])

  const years = useMemo(
    () => [...new Set((data?.periods ?? []).map((p) => p.year).filter((y): y is number => !!y))].sort((a, b) => a - b),
    [data],
  )
  const classNumbers = useMemo(
    () =>
      [
        ...new Set(
          (data?.periods ?? [])
            .filter((p) => !year || String(p.year) === year)
            .map((p) => p.classNumber)
            .filter((c): c is number => !!c),
        ),
      ].sort((a, b) => a - b),
    [data, year],
  )

  const exportCsv = () => {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const lines = [['Date', 'Period', 'School', 'Class', 'Summary', 'Lesson plan'].join(',')]
    for (const { p, school, plan } of rows)
      lines.push([p.date, slotLabel(p.slot), school?.name ?? '', classLabel(p), p.summary, plan?.title ?? ''].map(esc).join(','))
    downloadText(BOM + lines.join('\n'), `class-history-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv')
    toast(`Exported ${rows.length} classes.`, { tone: 'success' })
  }

  const onUndoable = (message: string, undo: Undo) =>
    toast(message, { tone: 'success', action: { label: 'Undo', onClick: () => void undo() } })

  // Group the visible rows by month.
  const groups: { month: string; items: typeof rows }[] = []
  for (const r of rows.slice(0, limit)) {
    const month = format(fromIso(r.p.date), 'MMMM yyyy')
    if (groups.at(-1)?.month !== month) groups.push({ month, items: [] })
    groups.at(-1)!.items.push(r)
  }

  const editingPeriod: Period | undefined =
    editing && data ? data.periods.find((p) => p.id === `${editing.date}:${editing.slot}`) : undefined
  const editingDay = editing ? data?.days.get(editing.date) : undefined

  return (
    <Page
      title="Class history"
      description="Every class you’ve taught. Click one to edit it."
      width="wide"
      actions={
        <Button icon={Download} onClick={exportCsv} disabled={!rows.length}>
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">CSV</span>
        </Button>
      }
    >
      <Card className="mb-4 space-y-3 p-4">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setLimit(PAGE)
            }}
            placeholder="Search notes and lesson plans…"
            aria-label="Search classes"
            className="h-11 pl-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Select aria-label="School" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            <option value="">All schools</option>
            {[...schools.values()].map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Year"
            value={year}
            onChange={(e) => {
              setYear(e.target.value)
              setCls('')
            }}
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </Select>
          <Select aria-label="Class" value={cls} onChange={(e) => setCls(e.target.value)}>
            <option value="">All classes</option>
            {classNumbers.map((c) => (
              <option key={c} value={c}>
                {year ? `${year}-${c}` : `Class ${c}`}
              </option>
            ))}
          </Select>
          <Input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-soft">
            {data ? `${rows.length.toLocaleString()} ${rows.length === 1 ? 'class' : 'classes'}` : ''}
          </p>
          <div className="w-56">
            <Switch checked={lunch} onChange={setLunch} label="Include lunch" />
          </div>
        </div>
      </Card>

      {!data ? (
        <div className="grid h-40 place-items-center">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={History}
            title={data.periods.length ? 'No classes match' : 'No classes yet'}
            description={data.periods.length ? 'Try clearing a filter.' : 'Classes you add to your schedule appear here.'}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.month} aria-label={g.month}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-ink-soft">{g.month}</h2>
              <Card className="divide-y divide-line overflow-hidden">
                {g.items.map(({ p, school, plan }) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setEditing({ date: p.date, slot: p.slot })}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-canvas"
                  >
                    <span className="w-16 shrink-0 text-sm">
                      <span className="block font-semibold text-ink">{format(fromIso(p.date), 'EEE d')}</span>
                      <span className="text-xs text-ink-faint">{slotLabel(p.slot, true)}</span>
                    </span>
                    <span className="w-12 shrink-0 text-lg font-extrabold" style={{ color: school?.color }}>
                      {classLabel(p)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {plan?.title || p.summary || <span className="text-ink-faint">No notes</span>}
                      </span>
                      {plan && p.summary && <span className="block truncate text-sm text-ink-soft">{p.summary}</span>}
                      <span className="block text-xs text-ink-faint">{school?.name ?? 'No school'}</span>
                    </span>
                  </button>
                ))}
              </Card>
            </section>
          ))}
          {rows.length > limit && (
            <div className="text-center">
              <Button onClick={() => setLimit((n) => n + PAGE)}>Show more ({(rows.length - limit).toLocaleString()} left)</Button>
            </div>
          )}
        </div>
      )}

      <PeriodEditor
        target={editing}
        onClose={() => setEditing(null)}
        period={editingPeriod}
        day={editingDay}
        school={editingDay?.schoolId ? schools.get(editingDay.schoolId) : undefined}
        onUndoable={onUndoable}
      />
    </Page>
  )
}

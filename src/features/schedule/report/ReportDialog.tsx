import { useEffect, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { addDays, eachWeekOfInterval, format, startOfWeek, subWeeks } from 'date-fns'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { Button, Dialog, Field, Input, Select, Spinner, Switch, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import type { School } from '@/data/schema'
import { getSettings } from '@/data/settings'
import { fromIso, iso, isWeekend, schoolYearStart } from '../model'
import { computeTally } from '../tally'
import { hasJapanese, registerJapaneseFont } from './fonts'
import { ReportDocument, type ReportData } from './ReportDocument'

interface Options {
  from: string
  to: string
  schoolId: string
  weekly: boolean
  notes: boolean
  title: string
}

async function buildReport(o: Options, schools: School[]): Promise<ReportData> {
  const settings = await getSettings()
  const [periodList, dayList, planList] = await Promise.all([
    db.periods.where('date').between(o.from, o.to, true, true).toArray(),
    db.dayAssignments.where('date').between(o.from, o.to, true, true).toArray(),
    db.lessonPlans.toArray(),
  ])
  const inSchool = (date: string) => !o.schoolId || dayList.find((d) => d.date === date)?.schoolId === o.schoolId
  const periods = periodList.filter((p) => inSchool(p.date))
  const days = dayList.filter((d) => !o.schoolId || d.schoolId === o.schoolId)
  const tally = computeTally({ periods, days, schools, from: o.from, to: o.to, schoolId: o.schoolId || null })

  const used = new Set([...days.map((d) => d.date), ...periods.map((p) => p.date)])
  const weekStartsOn = settings.weekStartsOn
  const weeks = o.weekly
    ? eachWeekOfInterval({ start: fromIso(o.from), end: fromIso(o.to) }, { weekStartsOn })
        .map((start) => {
          const all = Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((d) => iso(d) >= o.from && iso(d) <= o.to)
          return { start, days: all.filter((d) => !isWeekend(d) || used.has(iso(d))) }
        })
        .filter((w) => w.days.some((d) => used.has(iso(d))))
    : []

  const plans = new Map(planList.map((p) => [p.id, p]))
  const school = schools.find((s) => s.id === o.schoolId)
  const allText = [
    o.title,
    settings.profileName,
    ...schools.map((s) => s.name + s.jtes.map((j) => j.name).join('')),
    ...(o.notes ? periods.map((p) => p.summary + (p.lessonPlanId ? (plans.get(p.lessonPlanId)?.title ?? '') : '')) : []),
    ...days.map((d) => d.note + (d.dayType ?? '')),
  ].join(' ')

  return {
    title: o.title || (school ? `${school.name} teaching report` : 'Teaching report'),
    author: settings.profileName,
    from: o.from,
    to: o.to,
    generatedAt: new Date(),
    tally,
    weeks,
    days: new Map(days.map((d) => [d.date, d])),
    periods: new Map(periods.map((p) => [p.id, p])),
    schools: new Map(schools.map((s) => [s.id, s])),
    plans,
    includeNotes: o.notes,
    font: hasJapanese(allText) ? registerJapaneseFont() : 'Helvetica',
  }
}

export default function ReportDialog({ onClose, schools }: { onClose: () => void; schools: School[] }) {
  const { toast } = useFeedback()
  const today = new Date()
  const [o, setO] = useState<Options>({
    from: iso(startOfWeek(subWeeks(today, 3), { weekStartsOn: 1 })),
    to: iso(today),
    schoolId: '',
    weekly: true,
    notes: true,
    title: '',
  })
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (c: Partial<Options>) => {
    setO((x) => ({ ...x, ...c }))
    setUrl(null)
  }

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  const generate = async () => {
    setBusy(true)
    try {
      const data = await buildReport(o, schools)
      const blob = await pdf(<ReportDocument data={data} />).toBlob()
      setUrl(URL.createObjectURL(blob))
    } catch (e) {
      toast(`Couldn’t create the report: ${e instanceof Error ? e.message : String(e)}`, { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const fileName = `teaching-report-${o.from}-to-${o.to}.pdf`

  return (
    <Dialog
      open
      onClose={onClose}
      size={url ? 'full' : 'md'}
      title="PDF report"
      description="A summary of your teaching plus a timetable page for each week."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {url ? (
            <>
              <Button icon={RefreshCw} onClick={generate} disabled={busy}>
                Regenerate
              </Button>
              <a href={url} download={fileName}>
                <Button variant="primary" icon={Download}>
                  Download PDF
                </Button>
              </a>
            </>
          ) : (
            <Button variant="primary" icon={FileText} onClick={generate} disabled={busy || o.from > o.to}>
              {busy ? 'Creating…' : 'Create report'}
            </Button>
          )}
        </>
      }
    >
      <div className={url ? 'grid gap-5 lg:grid-cols-[18rem_1fr]' : ''}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              {(id) => <Input id={id} type="date" value={o.from} onChange={(e) => set({ from: e.target.value })} />}
            </Field>
            <Field label="To">{(id) => <Input id={id} type="date" value={o.to} onChange={(e) => set({ to: e.target.value })} />}</Field>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => set({ to: iso(today) })}>
              Up to now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => set({ from: iso(schoolYearStart(today)), to: iso(today) })}>
              This school year
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => set({ from: format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'), to: iso(today) })}
            >
              This month
            </Button>
          </div>
          <Field label="School">
            {(id) => (
              <Select id={id} value={o.schoolId} onChange={(e) => set({ schoolId: e.target.value })}>
                <option value="">All schools</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Title (optional)">
            {(id) => <Input id={id} value={o.title} placeholder="Teaching report" onChange={(e) => set({ title: e.target.value })} />}
          </Field>
          <Switch
            checked={o.weekly}
            onChange={(weekly) => set({ weekly })}
            label="Weekly timetable pages"
            description="One landscape page per week."
          />
          <Switch
            checked={o.notes}
            onChange={(notes) => set({ notes })}
            label="Include lesson notes"
            description="Summaries and lesson plan titles."
          />
        </div>
        {(url || busy) && (
          <div className="min-h-[60vh] overflow-hidden rounded-2xl border border-line bg-canvas">
            {busy ? (
              <div className="grid h-full place-items-center">
                <Spinner className="size-7" />
              </div>
            ) : (
              <iframe title="Report preview" src={url!} className="h-[70vh] w-full" />
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}

import { useEffect, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { addDays, addWeeks, differenceInCalendarWeeks, format, startOfMonth, startOfWeek, subWeeks } from 'date-fns'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { Button, Dialog, Field, Input, Spinner, Switch, useFeedback, ButtonLink } from '@/components/ui'
import { db } from '@/data/db'
import type { School } from '@/data/schema'
import { getSettings } from '@/data/settings'
import { fromIso, iso, schoolYearStart } from '../model'
import { tallyWeeks, weeklyTally } from '../tally'
import { hasJapanese, registerJapaneseFont } from './fonts'
import { ReportDocument, type ReportData } from './ReportDocument'

interface Options {
  start: string
  weeks: number
  notes: boolean
}

async function buildReport(o: Options, schools: School[]): Promise<ReportData> {
  const settings = await getSettings()
  const weeks = tallyWeeks(fromIso(o.start), o.weeks, settings.weekStartsOn)
  const from = iso(weeks[0].start)
  const to = iso(addDays(weeks[weeks.length - 1].start, 6))
  const [periods, days, planList] = await Promise.all([
    db.periods.where('date').between(from, to, true, true).toArray(),
    db.dayAssignments.where('date').between(from, to, true, true).toArray(),
    db.lessonPlans.toArray(),
  ])
  const plans = new Map(planList.map((p) => [p.id, p]))
  const allText = [
    settings.profileName,
    ...schools.map((s) => s.name + s.jtes.map((j) => j.name).join('')),
    ...(o.notes ? periods.map((p) => p.summary + (p.lessonPlanId ? (plans.get(p.lessonPlanId)?.title ?? '') : '')) : []),
    ...days.map((d) => d.note + (d.dayType ?? '')),
    ...periods.map((p) => p.specialType ?? ''),
  ].join(' ')

  return {
    author: settings.profileName,
    weeks,
    days: new Map(days.map((d) => [d.date, d])),
    periods: new Map(periods.map((p) => [p.id, p])),
    schools,
    plans,
    tally: weeklyTally({ periods, days, schools, weeks }),
    includeNotes: o.notes,
    font: hasJapanese(allText) ? registerJapaneseFont() : 'Helvetica',
  }
}

export default function ReportDialog({ onClose, schools }: { onClose: () => void; schools: School[] }) {
  const { toast } = useFeedback()
  const today = new Date()
  const [o, setO] = useState<Options>({ start: iso(startOfWeek(subWeeks(today, 3), { weekStartsOn: 1 })), weeks: 4, notes: true })
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

  const first = startOfWeek(fromIso(o.start), { weekStartsOn: 1 })
  const last = addDays(addWeeks(first, o.weeks - 1), 4)
  const fileName = `schedule-record-${iso(first)}-to-${iso(last)}.pdf`
  const setWeeks = (n: number) => set({ weeks: Math.min(52, Math.max(1, Math.round(n) || 1)) })

  return (
    <Dialog
      open
      onClose={onClose}
      size={url ? 'full' : 'md'}
      title="PDF report"
      description="Your weekly schedule record: two weeks to a page, then the class tally."
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
              <ButtonLink href={url} download={fileName} variant="primary" icon={Download}>
                Download PDF
              </ButtonLink>
            </>
          ) : (
            <Button variant="primary" icon={FileText} onClick={generate} disabled={busy || !o.start}>
              {busy ? 'Creating…' : 'Create report'}
            </Button>
          )}
        </>
      }
    >
      <div className={url ? 'grid gap-5 lg:grid-cols-[18rem_1fr]' : ''}>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <Field label="Start week">
              {(id) => <Input id={id} type="date" value={o.start} onChange={(e) => e.target.value && set({ start: e.target.value })} />}
            </Field>
            <Field label="Weeks">
              {(id) => <Input id={id} type="number" min={1} max={52} value={o.weeks} onChange={(e) => setWeeks(Number(e.target.value))} />}
            </Field>
          </div>
          <p className="text-sm text-ink-soft">
            {format(first, 'd MMM yyyy')} – {format(last, 'd MMM yyyy')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setWeeks(differenceInCalendarWeeks(today, first, { weekStartsOn: 1 }) + 1)}>
              Up to now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const start = startOfWeek(schoolYearStart(today), { weekStartsOn: 1 })
                set({ start: iso(start), weeks: Math.min(52, differenceInCalendarWeeks(today, start, { weekStartsOn: 1 }) + 1) })
              }}
            >
              This school year
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const start = startOfWeek(startOfMonth(today), { weekStartsOn: 1 })
                set({ start: iso(start), weeks: differenceInCalendarWeeks(today, start, { weekStartsOn: 1 }) + 1 })
              }}
            >
              This month
            </Button>
          </div>
          <Switch
            checked={o.notes}
            onChange={(notes) => set({ notes })}
            label="Include lesson notes"
            description="Summaries, or the lesson plan’s title."
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

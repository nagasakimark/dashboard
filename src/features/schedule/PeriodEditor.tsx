import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ArrowRightLeft, History, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Dialog, Field, Input, Select, Textarea, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { PERIOD_TYPES, type DayAssignment, type Period, type School, type Slot } from '@/data/schema'
import { cn } from '@/lib/cn'
import { deletePeriod, movePeriod, savePeriod, type Undo } from './actions'
import { daySlots, fromIso, parseClass, previousForClass, slotLabel, slotTimes, timetableFor } from './model'

export interface PeriodTarget {
  date: string
  slot: Slot
}

interface Props {
  target: PeriodTarget | null
  onClose: () => void
  period: Period | undefined
  day: DayAssignment | undefined
  school: School | undefined
  onUndoable: (message: string, undo: Undo) => void
}

type Kind = 'class' | 'special'

export function PeriodEditor(props: Props) {
  // Remount per target so the form resets cleanly.
  return props.target ? <PeriodForm key={`${props.target.date}:${props.target.slot}`} {...props} target={props.target} /> : null
}

function PeriodForm({ target, onClose, period, day, school, onUndoable }: Props & { target: PeriodTarget }) {
  const { toast } = useFeedback()
  const [kind, setKind] = useState<Kind>(period?.kind ?? 'class')
  const [year, setYear] = useState<number | null>(period?.year ?? null)
  const [classNumber, setClassNumber] = useState<number | null>(period?.classNumber ?? null)
  const [classText, setClassText] = useState(period?.kind === 'class' && period.year ? `${period.year}-${period.classNumber}` : '')
  const [specialType, setSpecialType] = useState(period?.specialType ?? 'Lesson Planning')
  const [summary, setSummary] = useState(period?.summary ?? '')
  const [lessonPlanId, setLessonPlanId] = useState<string | null>(period?.lessonPlanId ?? null)
  const [moving, setMoving] = useState(false)
  const [moveDate, setMoveDate] = useState(target.date)
  const [moveSlot, setMoveSlot] = useState<string>(String(target.slot))
  const [error, setError] = useState<string | null>(null)

  const plans = useLiveQuery(() => db.lessonPlans.orderBy('title').toArray(), [])
  const history = useLiveQuery(() => (year ? db.periods.where('date').belowOrEqual(target.date).toArray() : []), [year, target.date])

  const previous = useMemo(
    () => (year && classNumber && history ? previousForClass(history, { ...target, year, classNumber }, school?.lunchAfter) : null),
    [history, year, classNumber, target, school?.lunchAfter],
  )

  const times = slotTimes(timetableFor(school, day), target.slot)
  const heading = `${format(fromIso(target.date), 'EEE d MMM')} · ${slotLabel(target.slot)}${times ? ` · ${times.start}–${times.end}` : ''}`

  const classesByYear = useMemo(() => {
    const m = new Map<number, number[]>()
    for (const c of school?.classes ?? [])
      m.set(
        c.year,
        [...(m.get(c.year) ?? []), c.classNumber].sort((a, b) => a - b),
      )
    return [...m].sort(([a], [b]) => a - b)
  }, [school])

  const pickClass = (y: number, n: number) => {
    setYear(y)
    setClassNumber(n)
    setClassText(`${y}-${n}`)
    setError(null)
  }

  // Suggested plans first: same year, then the rest.
  const sortedPlans = useMemo(() => {
    const list = plans ?? []
    return [...list.filter((p) => year && p.year === year), ...list.filter((p) => !year || p.year !== year)]
  }, [plans, year])

  const submit = async () => {
    if (kind === 'class' && (!year || !classNumber)) {
      setError('Choose a class, or type one like 5-1.')
      return
    }
    const undo = await savePeriod({
      date: target.date,
      slot: target.slot,
      kind,
      year: kind === 'class' ? year : null,
      classNumber: kind === 'class' ? classNumber : null,
      specialType: kind === 'special' ? specialType.trim() || 'Other' : null,
      summary: summary.trim(),
      lessonPlanId: kind === 'class' ? lessonPlanId : null,
      curriculumItemId: period?.curriculumItemId ?? null,
    })
    onUndoable(period ? 'Period updated.' : 'Period added.', undo)
    onClose()
  }

  const onDelete = async () => {
    if (!period) return
    const undo = await deletePeriod(period.id)
    onUndoable('Period removed.', undo)
    onClose()
  }

  const onMove = async (copy: boolean) => {
    if (!period) return
    const slot: Slot = moveSlot === 'lunch' ? 'lunch' : Number(moveSlot)
    const undo = await movePeriod(period.id, { date: moveDate, slot }, copy)
    if (!undo) return toast('That’s the same slot.')
    onUndoable(copy ? 'Period copied.' : 'Period moved.', undo)
    onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        void submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={period ? 'Edit period' : 'Add a period'}
      description={
        <span className="flex items-center gap-2">
          {school && <span className="size-2.5 rounded-full" style={{ backgroundColor: school.color }} aria-hidden />}
          {heading}
          {school && <span className="text-ink-faint">· {school.name}</span>}
        </span>
      }
      footer={
        <>
          {period && (
            <Button variant="ghost" icon={Trash2} className="mr-auto text-danger hover:text-danger" onClick={onDelete}>
              Remove
            </Button>
          )}
          {error && <p className="mr-auto text-sm font-medium text-danger">{error}</p>}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} title="Save (Ctrl+Enter)">
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div role="radiogroup" aria-label="Period type" className="grid grid-cols-2 gap-1 rounded-xl bg-ink/5 p-1">
          {(['class', 'special'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                'h-9 rounded-lg text-sm font-semibold transition-colors',
                kind === k ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft',
              )}
            >
              {k === 'class' ? 'Class' : 'Other activity'}
            </button>
          ))}
        </div>

        {kind === 'class' ? (
          <div className="space-y-3">
            {classesByYear.length > 0 && (
              <div className="space-y-2" role="group" aria-label="Classes">
                {classesByYear.map(([y, numbers]) => (
                  <div key={y} className="flex flex-wrap items-center gap-1.5">
                    {numbers.map((n) => {
                      const on = year === y && classNumber === n
                      return (
                        <button
                          key={n}
                          type="button"
                          aria-pressed={on}
                          onClick={() => pickClass(y, n)}
                          className={cn(
                            'h-9 min-w-12 rounded-xl border px-2.5 text-sm font-bold transition-colors',
                            on ? 'border-transparent text-white shadow-sm' : 'border-line bg-surface text-ink hover:bg-canvas',
                          )}
                          style={on ? { backgroundColor: school?.color ?? 'var(--color-accent)' } : undefined}
                        >
                          {y}-{n}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
            <Field label={classesByYear.length ? 'Or type a class' : 'Class'} hint="Year and class number, e.g. 5-1">
              {(id) => (
                <Input
                  id={id}
                  value={classText}
                  inputMode="numeric"
                  placeholder="5-1"
                  className="w-32"
                  autoFocus={!classesByYear.length}
                  onChange={(e) => {
                    setClassText(e.target.value)
                    const parsed = parseClass(e.target.value)
                    setYear(parsed?.year ?? null)
                    setClassNumber(parsed?.classNumber ?? null)
                  }}
                />
              )}
            </Field>
          </div>
        ) : (
          <div className="space-y-3">
            <div role="radiogroup" aria-label="Activity" className="flex flex-wrap gap-1.5">
              {PERIOD_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={specialType === t}
                  onClick={() => setSpecialType(t)}
                  className={cn(
                    'h-9 rounded-xl border px-3 text-sm font-semibold transition-colors',
                    specialType === t
                      ? 'border-accent bg-accent-soft text-accent-strong'
                      : 'border-line bg-surface text-ink-soft hover:bg-canvas',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <Field label="Or describe it">
              {(id) => <Input id={id} value={specialType} onChange={(e) => setSpecialType(e.target.value)} />}
            </Field>
          </div>
        )}

        <Field label={kind === 'class' ? 'What you did / plan to do' : 'Notes'}>
          {(id) => (
            <div className="space-y-2">
              <Textarea
                id={id}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder={kind === 'class' ? 'e.g. Unit 3 — “What do you want?” shopping game' : ''}
              />
              {kind === 'class' && previous && (
                <button
                  type="button"
                  onClick={() => {
                    setSummary(previous.summary)
                    if (previous.lessonPlanId) setLessonPlanId(previous.lessonPlanId)
                  }}
                  className="flex w-full items-start gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-left text-sm text-ink-soft hover:border-accent hover:bg-accent-soft/50"
                >
                  <History size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">
                      Copy from {previous.year}-{previous.classNumber}, {format(fromIso(previous.date), 'd MMM')}:
                    </span>{' '}
                    <span className="line-clamp-2">{previous.summary || 'linked lesson plan'}</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </Field>

        {kind === 'class' && (
          <Field label="Lesson plan" hint="Plans for this year group are listed first.">
            {(id) => (
              <Select id={id} value={lessonPlanId ?? ''} onChange={(e) => setLessonPlanId(e.target.value || null)}>
                <option value="">None</option>
                {sortedPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.year ? `Y${p.year} · ` : ''}
                    {p.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        {period && (
          <div className="rounded-2xl border border-line">
            <button
              type="button"
              onClick={() => setMoving((m) => !m)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-ink-soft hover:text-ink"
              aria-expanded={moving}
            >
              <ArrowRightLeft size={16} aria-hidden /> Move or copy to another day or period
            </button>
            {moving && (
              <div className="flex flex-wrap items-end gap-2 border-t border-line px-4 py-3">
                <Field label="Date">
                  {(id) => <Input id={id} type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className="w-40" />}
                </Field>
                <Field label="Period">
                  {(id) => (
                    <Select id={id} value={moveSlot} onChange={(e) => setMoveSlot(e.target.value)} className="w-32">
                      {daySlots(school).map((s) => (
                        <option key={s} value={String(s)}>
                          {slotLabel(s)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Button onClick={() => onMove(false)}>Move</Button>
                <Button variant="ghost" onClick={() => onMove(true)}>
                  Copy
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}

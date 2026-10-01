import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { ArrowRightLeft, History, ListChecks, Plus, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Dialog, Field, Input, Select, Textarea, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { classKey, PERIOD_TYPES, type DayAssignment, type Period, type School, type Slot } from '@/data/schema'
import { classPosition, progressIndex, setTaught, trackedClasses } from '@/features/curriculum/model'
import { useSchools } from './hooks'
import { cn } from '@/lib/cn'
import { deletePeriod, movePeriod, savePeriod, type Undo } from './actions'
import { daySlots, fromIso, parseClass, previousForClass, sameDayLesson, slotLabel, slotTimes, timetableFor } from './model'

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
  const navigate = useNavigate()
  const [kind, setKind] = useState<Kind>(period?.kind ?? 'class')
  const [year, setYear] = useState<number | null>(period?.year ?? null)
  const [classNumber, setClassNumber] = useState<number | null>(period?.classNumber ?? null)
  const [classText, setClassText] = useState(period?.kind === 'class' && period.year ? `${period.year}-${period.classNumber}` : '')
  const [specialType, setSpecialType] = useState(period?.specialType ?? 'Lesson Planning')
  const [summary, setSummary] = useState(period?.summary ?? '')
  const [lessonPlanId, setLessonPlanId] = useState<string | null>(period?.lessonPlanId ?? null)
  const [itemId, setItemId] = useState<string | null>(period?.curriculumItemId ?? null)
  const [moving, setMoving] = useState(false)
  const [moveDate, setMoveDate] = useState(target.date)
  const [moveSlot, setMoveSlot] = useState<string>(String(target.slot))
  const [error, setError] = useState<string | null>(null)

  const plans = useLiveQuery(() => db.lessonPlans.orderBy('title').toArray(), [])
  const history = useLiveQuery(() => (year ? db.periods.where('date').belowOrEqual(target.date).toArray() : []), [year, target.date])
  const sameDay = useLiveQuery(() => db.periods.where('date').equals(target.date).toArray(), [target.date])

  // What "Copy from…" offers: the same year group earlier today (usually the same lesson), else this class's last lesson.
  const previous = useMemo(() => {
    if (!year || !classNumber) return null
    return (
      sameDayLesson(sameDay ?? [], { ...target, year }, school?.lunchAfter) ??
      (history ? previousForClass(history, { ...target, year, classNumber }, school?.lunchAfter) : null)
    )
  }, [sameDay, history, year, classNumber, target, school?.lunchAfter])

  // The description is filled in from the same year group's lesson today, until you change it.
  const [auto, setAuto] = useState<{ summary: string; plan: string | null; from: string } | null>(null)
  const autofill = (y: number | null) => {
    if (!y || kind !== 'class') return
    const untouched = auto ? summary === auto.summary && lessonPlanId === auto.plan : !summary.trim() && !lessonPlanId
    if (!untouched) return
    const src = sameDayLesson(sameDay ?? [], { ...target, year: y }, school?.lunchAfter)
    if (src) {
      setSummary(src.summary)
      setLessonPlanId(src.lessonPlanId)
      setAuto({ summary: src.summary, plan: src.lessonPlanId, from: `${src.year}-${src.classNumber}` })
    } else if (auto) {
      setSummary('')
      setLessonPlanId(null)
      setAuto(null)
    }
  }

  // Curricula that track this class, with their items and progress.
  const schools = useSchools()
  const curriculumData = useLiveQuery(async () => {
    const [curricula, items, progress] = await Promise.all([
      db.curricula.toArray(),
      db.curriculumItems.toArray(),
      db.classProgress.toArray(),
    ])
    return { curricula, items, index: progressIndex(progress) }
  }, [])
  const key = school && year && classNumber ? classKey(school.id, year, classNumber) : null
  const curriculumOptions = useMemo(() => {
    if (!key || !curriculumData || !schools) return []
    return curriculumData.curricula
      .filter((c) => trackedClasses(c, schools).some((t) => t.key === key))
      .map((c) => {
        const items = curriculumData.items.filter((i) => i.curriculumId === c.id).sort((a, b) => a.order - b.order)
        return { curriculum: c, items, next: classPosition(items, curriculumData.index, key).next }
      })
  }, [key, curriculumData, schools])
  const suggested = curriculumOptions.find((o) => o.next)?.next ?? null

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
    autofill(y)
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
      curriculumItemId: kind === 'class' ? itemId : null,
    })
    onUndoable(period ? 'Period updated.' : 'Period added.', undo)
    // Offer (never assume) to tick the curriculum item for this class.
    const item = kind === 'class' && itemId ? curriculumData?.items.find((i) => i.id === itemId) : undefined
    if (item && key && !curriculumData?.index.get(item.id)?.has(key))
      toast(`Mark “${item.text}” as taught for ${year}-${classNumber}?`, {
        duration: 12_000,
        action: { label: 'Mark taught', onClick: () => void setTaught(item, key, true, `${target.date}:${target.slot}`) },
      })
    onClose()
  }

  /** Save this period, then create a linked lesson plan and open it. */
  const createPlan = async () => {
    if (!year || !classNumber) {
      setError('Choose the class first.')
      return
    }
    await savePeriod({
      date: target.date,
      slot: target.slot,
      kind: 'class',
      year,
      classNumber,
      specialType: null,
      summary: summary.trim(),
      lessonPlanId: null,
      curriculumItemId: period?.curriculumItemId ?? null,
    })
    const q = new URLSearchParams({
      period: `${target.date}:${target.slot}`,
      year: String(year),
      title: summary.trim() || `${year}-${classNumber} lesson`,
    })
    if (school) q.set('school', school.id)
    navigate(`/lessons/new?${q}`)
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
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold tracking-wide text-ink-soft uppercase">Class</span>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Classes">
              {classesByYear.map(([y, numbers]) => (
                <span key={y} className="inline-flex overflow-hidden rounded-lg border border-line bg-surface">
                  {numbers.map((n) => {
                    const on = year === y && classNumber === n
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={on}
                        onClick={() => pickClass(y, n)}
                        className={cn(
                          'h-8 min-w-10 border-l border-line px-2 text-sm font-bold tabular-nums transition-colors first:border-l-0',
                          on ? 'text-white' : 'text-ink hover:bg-canvas',
                        )}
                        style={on ? { backgroundColor: school?.color ?? 'var(--color-accent)' } : undefined}
                      >
                        {y}-{n}
                      </button>
                    )
                  })}
                </span>
              ))}
              <Input
                aria-label={classesByYear.length ? 'Other class' : 'Class'}
                title="Year and class number, e.g. 5-1"
                value={classesByYear.some(([y, ns]) => y === year && ns.includes(classNumber ?? -1)) ? '' : classText}
                inputMode="numeric"
                placeholder={classesByYear.length ? 'Other' : 'e.g. 5-1'}
                className={cn('h-8 text-sm', classesByYear.length ? 'w-20' : 'w-28')}
                autoFocus={!classesByYear.length}
                onChange={(e) => {
                  setClassText(e.target.value)
                  const parsed = parseClass(e.target.value)
                  setYear(parsed?.year ?? null)
                  setClassNumber(parsed?.classNumber ?? null)
                  autofill(parsed?.year ?? null)
                }}
              />
            </div>
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
              {auto && summary === auto.summary && (
                <p className="text-xs text-ink-soft">Filled in from {auto.from} today. Change it if this class does something different.</p>
              )}
              {kind === 'class' && previous && !(previous.summary === summary && (previous.lessonPlanId ?? null) === lessonPlanId) && (
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
                      Copy from {previous.year}-{previous.classNumber},{' '}
                      {previous.date === target.date ? 'today' : format(fromIso(previous.date), 'd MMM')}:
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
              <div className="flex gap-2">
                <Select id={id} value={lessonPlanId ?? ''} onChange={(e) => setLessonPlanId(e.target.value || null)}>
                  <option value="">None</option>
                  {sortedPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.year ? `Y${p.year} · ` : ''}
                      {p.title}
                    </option>
                  ))}
                </Select>
                <Button icon={Plus} onClick={createPlan} title="Create a new lesson plan for this class">
                  New
                </Button>
              </div>
            )}
          </Field>
        )}

        {kind === 'class' && curriculumOptions.length > 0 && (
          <Field label="Curriculum item" hint={suggested && itemId !== suggested.id ? undefined : 'Links this lesson to your curriculum.'}>
            {(id) => (
              <div className="space-y-2">
                <Select id={id} value={itemId ?? ''} onChange={(e) => setItemId(e.target.value || null)}>
                  <option value="">None</option>
                  {curriculumOptions.map((o) => (
                    <optgroup key={o.curriculum.id} label={o.curriculum.name}>
                      {o.items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.text}
                          {curriculumData?.index.get(i.id)?.has(key!) ? ' ✓' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
                {suggested && itemId !== suggested.id && (
                  <button
                    type="button"
                    onClick={() => setItemId(suggested.id)}
                    className="flex w-full items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-left text-sm text-ink-soft hover:border-accent hover:bg-accent-soft/50"
                  >
                    <ListChecks size={16} className="shrink-0 text-accent" aria-hidden />
                    <span>
                      Next for {year}-{classNumber}: <span className="font-semibold text-ink">{suggested.text}</span>
                    </span>
                  </button>
                )}
              </div>
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

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Clock, Copy, Plus, School as SchoolIcon, Trash2, UserRound, Users, X } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button, Card, Field, IconButton, Input, Select, Spinner, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { newId, save } from '@/data/repo'
import { School as SchoolSchema, type School, type SchoolClass, type Timetable } from '@/data/schema'
import { cn } from '@/lib/cn'
import { blankTimetable, newSchoolDraft, SCHOOL_COLORS, type SchoolDraft } from './draft'

/** Full-page school editor: details and JTEs on the left, classes and timetables on the right. */
export default function SchoolEditorPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const existing = useLiveQuery(async () => (isNew ? null : ((await db.schools.get(id ?? '')) ?? null)), [id, isNew])
  if (!isNew && existing === undefined)
    return (
      <div className="grid h-64 place-items-center">
        <Spinner />
      </div>
    )
  return <Editor key={id} school={isNew ? null : (existing ?? null)} />
}

function Editor({ school }: { school: School | null }) {
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const [draft, setDraft] = useState<SchoolDraft>(() => (school ? structuredClone(school) : newSchoolDraft()))
  const [error, setError] = useState<string | null>(null)
  const set = (changes: Partial<SchoolDraft>) => setDraft((d) => ({ ...d, ...changes }))

  const onSave = async () => {
    if (!draft.name.trim()) return setError('Give the school a name.')
    const now = Date.now()
    const record = { ...draft, name: draft.name.trim(), id: draft.id ?? newId(), createdAt: draft.createdAt ?? now, updatedAt: now }
    const parsed = SchoolSchema.safeParse(record)
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Something isn’t valid.')
    await save('schools', parsed.data)
    toast(`${parsed.data.name} saved.`, { tone: 'success' })
    navigate('/schools')
  }

  return (
    <Page
      width="wide"
      title={
        <span className="flex items-center gap-2.5">
          <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: draft.color }} aria-hidden />
          {school ? draft.name || school.name : 'New school'}
        </span>
      }
      actions={
        <>
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <Button variant="ghost" onClick={() => navigate('/schools')}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave}>
            Save school
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-5">
          <Details draft={draft} set={set} />
          <Jtes draft={draft} set={set} />
        </div>
        <div className="min-w-0 space-y-5">
          <Classes draft={draft} set={set} />
          <Timetables draft={draft} set={set} />
        </div>
      </div>
    </Page>
  )
}

interface PartProps {
  draft: SchoolDraft
  set: (changes: Partial<SchoolDraft>) => void
}

const Heading = ({ icon: Icon, children, aside }: { icon: typeof Users; children: React.ReactNode; aside?: React.ReactNode }) => (
  <div className="flex items-center gap-2 border-b border-line px-4 py-3">
    <Icon size={16} className="text-accent" aria-hidden />
    <h2 className="flex-1 text-sm font-semibold text-ink">{children}</h2>
    {aside}
  </div>
)

function Details({ draft, set }: PartProps) {
  const setPeriodCount = (n: number) =>
    set({
      periodCount: n,
      lunchAfter: Math.min(draft.lunchAfter, n),
      // Keep every timetable's rows in step with the number of periods.
      timetables: draft.timetables.map((t) => ({
        ...t,
        periods: Array.from({ length: n }, (_, i) => t.periods.find((p) => p.slot === i + 1) ?? { slot: i + 1, start: '', end: '' }),
      })),
    })
  return (
    <Card>
      <Heading icon={SchoolIcon}>School</Heading>
      <div className="space-y-4 p-4">
        <Field label="Name">
          {(id) => (
            <Input
              id={id}
              value={draft.name}
              autoFocus={!draft.id}
              placeholder="e.g. Sakura Elementary"
              onChange={(e) => set({ name: e.target.value })}
            />
          )}
        </Field>
        <Field label="Colour">
          {(id) => (
            <div id={id} role="radiogroup" aria-label="School colour" className="flex flex-wrap items-center gap-1.5">
              {SCHOOL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={draft.color === c}
                  aria-label={c}
                  onClick={() => set({ color: c })}
                  className={cn(
                    'size-7 rounded-full ring-offset-2 transition-transform hover:scale-110',
                    draft.color === c && 'ring-2 ring-ink',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                aria-label="Custom colour"
                value={draft.color}
                onChange={(e) => set({ color: e.target.value })}
                className="size-7 cursor-pointer rounded-full border border-line bg-transparent p-0.5"
              />
            </div>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Periods a day">
            {(id) => (
              <Select id={id} value={draft.periodCount} onChange={(e) => setPeriodCount(Number(e.target.value))}>
                {[4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Lunch after">
            {(id) => (
              <Select id={id} value={draft.lunchAfter} onChange={(e) => set({ lunchAfter: Number(e.target.value) })}>
                {Array.from({ length: draft.periodCount }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Period {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </div>
    </Card>
  )
}

function Jtes({ draft, set }: PartProps) {
  const [name, setName] = useState('')
  return (
    <Card>
      <Heading icon={UserRound}>JTEs</Heading>
      <ul className="divide-y divide-line">
        {draft.jtes.map((j) => (
          <li key={j.id} className="flex items-center gap-2 px-4 py-1.5">
            <Input
              aria-label="JTE name"
              value={j.name}
              onChange={(e) => set({ jtes: draft.jtes.map((x) => (x.id === j.id ? { ...x, name: e.target.value } : x)) })}
              className="h-8 border-transparent bg-transparent px-1 shadow-none hover:border-line"
            />
            <span className="shrink-0 text-xs text-ink-faint">
              {(() => {
                const n = draft.classes.filter((c) => c.jteId === j.id).length
                return `${n} ${n === 1 ? 'class' : 'classes'}`
              })()}
            </span>
            <IconButton
              icon={X}
              label={`Remove ${j.name}`}
              size="sm"
              className="size-7"
              onClick={() =>
                set({
                  jtes: draft.jtes.filter((x) => x.id !== j.id),
                  classes: draft.classes.map((c) => (c.jteId === j.id ? { ...c, jteId: null } : c)),
                })
              }
            />
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          set({ jtes: [...draft.jtes, { id: newId(), name: name.trim() }] })
          setName('')
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a JTE…" aria-label="New JTE name" className="h-9" />
        <Button type="submit" size="sm" icon={Plus} disabled={!name.trim()} className="h-9">
          Add
        </Button>
      </form>
    </Card>
  )
}

function Classes({ draft, set }: PartProps) {
  const [fromYear, setFromYear] = useState(1)
  const [toYear, setToYear] = useState(6)
  const [perYear, setPerYear] = useState(2)
  const byYear = new Map<number, SchoolClass[]>()
  for (const c of [...draft.classes].sort((a, b) => a.year - b.year || a.classNumber - b.classNumber))
    byYear.set(c.year, [...(byYear.get(c.year) ?? []), c])

  const generate = () => {
    const have = new Set(draft.classes.map((c) => `${c.year}-${c.classNumber}`))
    const add: SchoolClass[] = []
    for (let y = Math.min(fromYear, toYear); y <= Math.max(fromYear, toYear); y++)
      for (let n = 1; n <= perYear; n++) if (!have.has(`${y}-${n}`)) add.push({ id: newId(), year: y, classNumber: n, jteId: null })
    set({ classes: [...draft.classes, ...add] })
  }
  const addToYear = (year: number) => {
    const next = Math.max(0, ...(byYear.get(year) ?? []).map((c) => c.classNumber)) + 1
    set({ classes: [...draft.classes, { id: newId(), year, classNumber: next, jteId: null }] })
  }
  const num = (v: number, onChange: (n: number) => void, label: string) => (
    <Input
      type="number"
      min={1}
      max={12}
      value={v}
      aria-label={label}
      onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
      className="h-8 w-14 px-1 text-center"
    />
  )
  const nextYear = Math.max(0, ...byYear.keys()) + 1

  return (
    <Card>
      <Heading
        icon={Users}
        aside={
          <span className="flex flex-wrap items-center justify-end gap-1.5 text-xs text-ink-soft">
            Years {num(fromYear, setFromYear, 'From year')} – {num(toYear, setToYear, 'To year')} ×{' '}
            {num(perYear, setPerYear, 'Classes per year')}
            <Button size="sm" variant="subtle" onClick={generate}>
              Add classes
            </Button>
          </span>
        }
      >
        Classes <span className="font-normal text-ink-faint">· {draft.classes.length}</span>
      </Heading>
      {byYear.size === 0 ? (
        <p className="p-4 text-sm text-ink-faint">No classes yet. Choose the years and how many classes each has, then “Add classes”.</p>
      ) : (
        <div className="divide-y divide-line">
          {[...byYear].map(([year, classes]) => (
            <div key={year} className="flex items-center gap-3 px-4 py-2">
              <span className="w-14 shrink-0 text-sm font-semibold text-ink-soft">Year {year}</span>
              <div className="flex flex-1 flex-wrap gap-2">
                {classes.map((c) => (
                  <div key={c.id} className="group relative w-28 rounded-xl border border-line bg-surface px-2 py-1.5">
                    <div className="text-center text-base font-extrabold" style={{ color: draft.color }}>
                      {c.year}-{c.classNumber}
                    </div>
                    <select
                      aria-label={`JTE for ${c.year}-${c.classNumber}`}
                      value={c.jteId ?? ''}
                      disabled={!draft.jtes.length}
                      onChange={(e) =>
                        set({ classes: draft.classes.map((x) => (x.id === c.id ? { ...x, jteId: e.target.value || null } : x)) })
                      }
                      className="w-full truncate rounded-md bg-canvas py-0.5 text-center text-xs text-ink-soft disabled:opacity-50"
                    >
                      <option value="">{draft.jtes.length ? 'No JTE' : 'Add JTEs first'}</option>
                      {draft.jtes.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`Remove ${c.year}-${c.classNumber}`}
                      onClick={() => set({ classes: draft.classes.filter((x) => x.id !== c.id) })}
                      className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-ink text-white shadow group-hover:opacity-100 focus:opacity-100 [@media(hover:hover)]:opacity-0"
                    >
                      <X size={12} aria-hidden />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  aria-label={`Add a class to year ${year}`}
                  onClick={() => addToYear(year)}
                  className="grid w-12 place-items-center rounded-xl border border-dashed border-line text-ink-faint hover:border-accent hover:text-accent"
                >
                  <Plus size={16} aria-hidden />
                </button>
              </div>
            </div>
          ))}
          <div className="px-4 py-2">
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => addToYear(nextYear)}>
              Add year {nextYear}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function Timetables({ draft, set }: PartProps) {
  const update = (id: string, changes: Partial<Timetable>) =>
    set({ timetables: draft.timetables.map((t) => (t.id === id ? { ...t, ...changes } : t)) })
  const setTime = (t: Timetable, slot: number | 'lunch', key: 'start' | 'end', value: string) =>
    slot === 'lunch'
      ? update(t.id, { lunch: { ...t.lunch, [key]: value } })
      : update(t.id, { periods: t.periods.map((p) => (p.slot === slot ? { ...p, [key]: value } : p)) })
  const add = (from?: Timetable) =>
    set({
      timetables: [
        ...draft.timetables,
        from
          ? { ...structuredClone(from), id: newId(), name: `${from.name} (copy)` }
          : blankTimetable(`Timetable ${draft.timetables.length + 1}`, draft.periodCount),
      ],
    })
  const rows: (number | 'lunch')[] = []
  for (let n = 1; n <= draft.periodCount; n++) {
    rows.push(n)
    if (n === draft.lunchAfter) rows.push('lunch')
  }

  return (
    <Card>
      <Heading
        icon={Clock}
        aside={
          <Button size="sm" variant="subtle" icon={Plus} onClick={() => add()}>
            Timetable
          </Button>
        }
      >
        Timetables <span className="font-normal text-ink-faint">· one per bell schedule (normal, shortened, test days…)</span>
      </Heading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="w-24 px-4 py-2 text-left text-xs font-semibold tracking-wide text-ink-soft uppercase">Period</th>
              {draft.timetables.map((t) => (
                <th key={t.id} className="min-w-52 px-2 py-2 text-left font-normal">
                  <div className="flex items-center gap-1">
                    <Input
                      aria-label="Timetable name"
                      value={t.name}
                      onChange={(e) => update(t.id, { name: e.target.value })}
                      className="h-8 font-semibold"
                    />
                    <IconButton icon={Copy} size="sm" label={`Duplicate ${t.name}`} onClick={() => add(t)} className="size-7" />
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      label={`Delete ${t.name}`}
                      disabled={draft.timetables.length === 1}
                      onClick={() => set({ timetables: draft.timetables.filter((x) => x.id !== t.id) })}
                      className="size-7"
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((slot) => {
              const label = slot === 'lunch' ? 'Lunch' : `Period ${slot}`
              return (
                <tr key={slot} className={slot === 'lunch' ? 'bg-warning/5' : ''}>
                  <th scope="row" className="px-4 py-1.5 text-left font-medium text-ink">
                    {label}
                  </th>
                  {draft.timetables.map((t) => {
                    const time = slot === 'lunch' ? t.lunch : (t.periods.find((p) => p.slot === slot) ?? { start: '', end: '' })
                    return (
                      <td key={t.id} className="px-2 py-1.5">
                        <div className="flex items-center gap-1 text-ink-faint">
                          <Input
                            type="time"
                            aria-label={`${t.name} ${label} starts`}
                            value={time.start}
                            onChange={(e) => setTime(t, slot, 'start', e.target.value)}
                            className="h-8 px-2"
                          />
                          –
                          <Input
                            type="time"
                            aria-label={`${t.name} ${label} ends`}
                            value={time.end}
                            onChange={(e) => setTime(t, slot, 'end', e.target.value)}
                            className="h-8 px-2"
                          />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

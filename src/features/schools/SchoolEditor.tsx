import { useState } from 'react'
import { Clock, Copy, Info, Plus, Trash2, UserRound, Users, X } from 'lucide-react'
import { Button, Dialog, Field, IconButton, Input, Select, Tabs, useFeedback } from '@/components/ui'
import { newId, save } from '@/data/repo'
import { School as SchoolSchema, type School, type SchoolClass, type Timetable } from '@/data/schema'
import { cn } from '@/lib/cn'

const COLORS = ['#4f46e5', '#2563eb', '#0891b2', '#059669', '#65a30d', '#d97706', '#ea580c', '#dc2626', '#db2777', '#9333ea']

type Draft = Omit<School, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: number }

const blankTimetable = (name: string, periodCount: number): Timetable => ({
  id: newId(),
  name,
  periods: Array.from({ length: periodCount }, (_, i) => ({ slot: i + 1, start: '', end: '' })),
  lunch: { start: '', end: '' },
})

function newSchool(): Draft {
  return {
    name: '',
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    lunchAfter: 4,
    periodCount: 6,
    jtes: [],
    classes: [],
    timetables: [blankTimetable('Normal', 6)],
    archived: false,
  }
}

type Tab = 'general' | 'classes' | 'timetables'

export function SchoolEditor({ school, onClose }: { school: School | null; onClose: () => void }) {
  const { toast } = useFeedback()
  const [draft, setDraft] = useState<Draft>(() => (school ? structuredClone(school) : newSchool()))
  const [tab, setTab] = useState<Tab>('general')
  const [error, setError] = useState<string | null>(null)
  const set = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }))

  const onSave = async () => {
    if (!draft.name.trim()) {
      setTab('general')
      setError('Give the school a name.')
      return
    }
    const now = Date.now()
    const record = { ...draft, name: draft.name.trim(), id: draft.id ?? newId(), createdAt: draft.createdAt ?? now, updatedAt: now }
    const parsed = SchoolSchema.safeParse(record)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Something isn’t valid.')
      return
    }
    await save('schools', parsed.data)
    toast(`${parsed.data.name} saved.`, { tone: 'success' })
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={school ? `Edit ${school.name}` : 'Add a school'}
      footer={
        <>
          {error && <p className="mr-auto text-sm font-medium text-danger">{error}</p>}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave}>
            Save school
          </Button>
        </>
      }
    >
      <Tabs<Tab>
        className="mb-5"
        value={tab}
        onChange={setTab}
        label="School settings"
        items={[
          { id: 'general', label: 'General', icon: Info },
          { id: 'classes', label: 'Classes & JTEs', icon: Users, count: draft.classes.length },
          { id: 'timetables', label: 'Timetables', icon: Clock, count: draft.timetables.length },
        ]}
      />
      {tab === 'general' && <GeneralTab draft={draft} set={set} />}
      {tab === 'classes' && <ClassesTab draft={draft} set={set} />}
      {tab === 'timetables' && <TimetablesTab draft={draft} set={set} />}
    </Dialog>
  )
}

interface TabProps {
  draft: Draft
  set: (changes: Partial<Draft>) => void
}

function GeneralTab({ draft, set }: TabProps) {
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
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="School name" className="sm:col-span-2">
        {(id) => (
          <Input
            id={id}
            value={draft.name}
            autoFocus
            placeholder="e.g. Sakura Elementary"
            onChange={(e) => set({ name: e.target.value })}
          />
        )}
      </Field>
      <Field label="Colour" className="sm:col-span-2">
        {(id) => (
          <div id={id} role="radiogroup" aria-label="School colour" className="flex flex-wrap items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={draft.color === c}
                aria-label={c}
                onClick={() => set({ color: c })}
                className={cn(
                  'size-8 rounded-full ring-offset-2 transition-transform hover:scale-110',
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
              className="size-8 cursor-pointer rounded-full border border-line bg-transparent p-0.5"
            />
          </div>
        )}
      </Field>
      <Field label="Periods per day">
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
      <Field label="Lunch comes after">
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
  )
}

function ClassesTab({ draft, set }: TabProps) {
  const [fromYear, setFromYear] = useState(1)
  const [toYear, setToYear] = useState(6)
  const [perYear, setPerYear] = useState(2)
  const [jteName, setJteName] = useState('')

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
  const setJte = (classId: string, jteId: string | null) =>
    set({ classes: draft.classes.map((c) => (c.id === classId ? { ...c, jteId } : c)) })

  const num = (v: number, onChange: (n: number) => void, label: string) => (
    <Input
      type="number"
      min={1}
      max={12}
      value={v}
      aria-label={label}
      onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
      className="w-16 text-center"
    />
  )

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink">JTEs</h3>
        <div className="flex flex-wrap gap-2">
          {draft.jtes.map((j) => (
            <span key={j.id} className="inline-flex items-center gap-1 rounded-full bg-ink/5 py-1 pr-1 pl-3 text-sm">
              <UserRound size={14} className="text-ink-faint" aria-hidden />
              {j.name}
              <IconButton
                icon={X}
                label={`Remove ${j.name}`}
                size="sm"
                className="size-6"
                onClick={() =>
                  set({
                    jtes: draft.jtes.filter((x) => x.id !== j.id),
                    classes: draft.classes.map((c) => (c.jteId === j.id ? { ...c, jteId: null } : c)),
                  })
                }
              />
            </span>
          ))}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!jteName.trim()) return
              set({ jtes: [...draft.jtes, { id: newId(), name: jteName.trim() }] })
              setJteName('')
            }}
          >
            <Input
              value={jteName}
              onChange={(e) => setJteName(e.target.value)}
              placeholder="Add a JTE…"
              aria-label="New JTE name"
              className="h-8 w-44"
            />
            <Button type="submit" size="sm" icon={Plus} disabled={!jteName.trim()}>
              Add
            </Button>
          </form>
        </div>
      </section>

      <section className="rounded-2xl bg-canvas p-4">
        <h3 className="mb-3 text-sm font-semibold text-ink">Quick add classes</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          Years {num(fromYear, setFromYear, 'From year')} to {num(toYear, setToYear, 'To year')},{' '}
          {num(perYear, setPerYear, 'Classes per year')} classes each
          <Button size="sm" variant="subtle" icon={Plus} onClick={generate}>
            Add classes
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {byYear.size === 0 && <p className="text-sm text-ink-faint">No classes yet. Use quick add above.</p>}
        {[...byYear].map(([year, classes]) => (
          <div key={year} className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-sm font-semibold text-ink-soft">Year {year}</span>
            {classes.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface py-1 pr-1 pl-2.5 text-sm">
                <span className="font-semibold" style={{ color: draft.color }}>
                  {c.year}-{c.classNumber}
                </span>
                {draft.jtes.length > 0 && (
                  <select
                    aria-label={`JTE for ${c.year}-${c.classNumber}`}
                    value={c.jteId ?? ''}
                    onChange={(e) => setJte(c.id, e.target.value || null)}
                    className="max-w-28 rounded-md bg-transparent py-0.5 text-xs text-ink-soft"
                  >
                    <option value="">No JTE</option>
                    {draft.jtes.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name}
                      </option>
                    ))}
                  </select>
                )}
                <IconButton
                  icon={X}
                  label={`Remove ${c.year}-${c.classNumber}`}
                  size="sm"
                  className="size-6"
                  onClick={() => set({ classes: draft.classes.filter((x) => x.id !== c.id) })}
                />
              </span>
            ))}
            <IconButton icon={Plus} label={`Add a class to year ${year}`} size="sm" variant="subtle" onClick={() => addToYear(year)} />
          </div>
        ))}
      </section>
    </div>
  )
}

function TimetablesTab({ draft, set }: TabProps) {
  const [active, setActive] = useState(draft.timetables[0]?.id ?? '')
  const t = draft.timetables.find((x) => x.id === active) ?? draft.timetables[0]
  const update = (changes: Partial<Timetable>) =>
    set({ timetables: draft.timetables.map((x) => (x.id === t.id ? { ...x, ...changes } : x)) })

  const add = (from?: Timetable) => {
    const next = from
      ? { ...structuredClone(from), id: newId(), name: `${from.name} (copy)` }
      : blankTimetable(`Timetable ${draft.timetables.length + 1}`, draft.periodCount)
    set({ timetables: [...draft.timetables, next] })
    setActive(next.id)
  }

  const setTime = (slot: number | 'lunch', key: 'start' | 'end', value: string) =>
    slot === 'lunch'
      ? update({ lunch: { ...t.lunch, [key]: value } })
      : update({ periods: t.periods.map((p) => (p.slot === slot ? { ...p, [key]: value } : p)) })

  const rows: (number | 'lunch')[] = []
  for (const p of t.periods) {
    rows.push(p.slot)
    if (p.slot === draft.lunchAfter) rows.push('lunch')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Schools often have several bell schedules (normal days, shortened days, test days). Pick one per day on the schedule.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={t.id}
          onChange={setActive}
          label="Timetables"
          items={draft.timetables.map((x) => ({ id: x.id, label: x.name || 'Untitled' }))}
        />
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => add()}>
          New
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Timetable name" className="min-w-48 flex-1">
          {(id) => <Input id={id} value={t.name} onChange={(e) => update({ name: e.target.value })} />}
        </Field>
        <Button size="md" icon={Copy} onClick={() => add(t)}>
          Duplicate
        </Button>
        <Button
          size="md"
          variant="ghost"
          icon={Trash2}
          className="text-danger hover:text-danger"
          disabled={draft.timetables.length === 1}
          onClick={() => {
            set({ timetables: draft.timetables.filter((x) => x.id !== t.id) })
            setActive(draft.timetables.find((x) => x.id !== t.id)?.id ?? '')
          }}
        >
          Delete
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-xs font-semibold tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Period</th>
              <th className="px-3 py-2 text-left">Starts</th>
              <th className="px-3 py-2 text-left">Ends</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((slot) => {
              const time = slot === 'lunch' ? t.lunch : t.periods.find((p) => p.slot === slot)!
              const label = slot === 'lunch' ? 'Lunch' : `Period ${slot}`
              return (
                <tr key={slot} className={slot === 'lunch' ? 'bg-warning/5' : ''}>
                  <th scope="row" className="px-3 py-1.5 text-left font-medium text-ink">
                    {label}
                  </th>
                  <td className="px-3 py-1.5">
                    <Input
                      type="time"
                      aria-label={`${label} starts`}
                      value={time.start}
                      onChange={(e) => setTime(slot, 'start', e.target.value)}
                      className="h-9 w-32"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="time"
                      aria-label={`${label} ends`}
                      value={time.end}
                      onChange={(e) => setTime(slot, 'end', e.target.value)}
                      className="h-9 w-32"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

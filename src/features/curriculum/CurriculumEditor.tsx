import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Dialog, Field, Input, Select, Switch, Textarea } from '@/components/ui'
import { db } from '@/data/db'
import { patch } from '@/data/repo'
import { classKey, type Curriculum } from '@/data/schema'
import { useSchools } from '@/features/schedule/hooks'
import { cn } from '@/lib/cn'
import { createCurriculum, trackedClasses, type CurriculumDraft } from './model'

interface Props {
  curriculum: Curriculum | null
  onClose: () => void
  onCreated?: (id: string) => void
}

/** Create or edit a curriculum's details and which classes follow it. */
export function CurriculumEditor({ curriculum, onClose, onCreated }: Props) {
  const schools = useSchools()
  const books = useLiveQuery(() => db.textbooks.orderBy('title').toArray(), [])
  const [d, setD] = useState<CurriculumDraft>(
    curriculum
      ? {
          name: curriculum.name,
          description: curriculum.description,
          textbookId: curriculum.textbookId,
          schoolId: curriculum.schoolId,
          year: curriculum.year,
          classKeys: curriculum.classKeys,
        }
      : { name: '', description: '', textbookId: null, schoolId: null, year: null, classKeys: [] },
  )
  const [fromSections, setFromSections] = useState(true)
  const [custom, setCustom] = useState((curriculum?.classKeys.length ?? 0) > 0)
  const set = (c: Partial<CurriculumDraft>) => setD((x) => ({ ...x, ...c }))

  const derived = useMemo(() => trackedClasses({ ...d, classKeys: [] }, schools ?? []), [d, schools])
  const allClasses = useMemo(
    () =>
      (schools ?? [])
        .filter((s) => !s.archived)
        .flatMap((s) =>
          s.classes.map((c) => ({
            key: classKey(s.id, c.year, c.classNumber),
            label: `${c.year}-${c.classNumber}`,
            school: s,
            year: c.year,
          })),
        )
        .sort((a, b) => a.school.name.localeCompare(b.school.name) || a.label.localeCompare(b.label, undefined, { numeric: true })),
    [schools],
  )

  const submit = async () => {
    if (!d.name.trim()) return
    const draft = { ...d, name: d.name.trim(), classKeys: custom ? d.classKeys : [] }
    if (curriculum) await patch('curricula', curriculum.id, draft)
    else onCreated?.((await createCurriculum(draft, { fromSections: fromSections && !!d.textbookId })).id)
    onClose()
  }

  const toggleKey = (k: string) => set({ classKeys: d.classKeys.includes(k) ? d.classKeys.filter((x) => x !== k) : [...d.classKeys, k] })

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={curriculum ? 'Edit curriculum' : 'New curriculum'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!d.name.trim()}>
            {curriculum ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          {(id) => (
            <Input
              id={id}
              autoFocus
              value={d.name}
              placeholder="e.g. Year 5 — first term"
              onChange={(e) => set({ name: e.target.value })}
            />
          )}
        </Field>
        <Field label="Textbook (optional)">
          {(id) => (
            <Select id={id} value={d.textbookId ?? ''} onChange={(e) => set({ textbookId: e.target.value || null })}>
              <option value="">None</option>
              {books?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Year (optional)">
          {(id) => (
            <Select id={id} value={d.year ?? ''} onChange={(e) => set({ year: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Any</option>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="School (optional)" className="sm:col-span-2">
          {(id) => (
            <Select id={id} value={d.schoolId ?? ''} onChange={(e) => set({ schoolId: e.target.value || null })}>
              <option value="">Any school</option>
              {schools?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Description (optional)" className="sm:col-span-2">
          {(id) => <Textarea id={id} rows={2} value={d.description} onChange={(e) => set({ description: e.target.value })} />}
        </Field>
        {!curriculum && d.textbookId && (
          <div className="sm:col-span-2">
            <Switch
              checked={fromSections}
              onChange={setFromSections}
              label="Start with one item per textbook section"
              description="You can edit, reorder or remove them afterwards."
            />
          </div>
        )}
        <div className="space-y-3 rounded-2xl bg-canvas p-4 sm:col-span-2">
          <Switch
            checked={custom}
            onChange={(v) => {
              setCustom(v)
              if (v && !d.classKeys.length) set({ classKeys: derived.map((c) => c.key) })
            }}
            label="Choose the classes to track"
            description={
              custom
                ? 'Tick the classes following this curriculum.'
                : derived.length
                  ? `Tracking ${derived.length} classes: ${derived.map((c) => (c.schoolLabel ? `${c.schoolLabel} ${c.label}` : c.label)).join(', ')}.`
                  : 'Set a year (and optionally a school) to track progress per class, or choose classes yourself.'
            }
          />
          {custom && (
            <div className="flex flex-wrap gap-1.5">
              {allClasses.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={d.classKeys.includes(c.key)}
                  onClick={() => toggleKey(c.key)}
                  className={cn(
                    'rounded-xl border px-2.5 py-1 text-sm font-semibold transition-colors',
                    d.classKeys.includes(c.key) ? 'border-transparent text-white' : 'border-line bg-surface text-ink-soft',
                  )}
                  style={d.classKeys.includes(c.key) ? { backgroundColor: c.school.color } : undefined}
                  title={c.school.name}
                >
                  {c.label}
                </button>
              ))}
              {allClasses.length === 0 && <p className="text-sm text-ink-faint">Add classes to your schools first.</p>}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}

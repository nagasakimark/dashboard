import { useMemo, useState } from 'react'
import { Link2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Badge, Button, EmptyState, Field, IconButton, Input, Select, Textarea, useFeedback } from '@/components/ui'
import { classKey, type Roster, type School } from '@/data/schema'
import { deleteRoster, saveRoster } from './actions'
import { classLabel, matchClassKey, numberedStudents, splitLines } from './rosters'
import { Segmented } from './widgets/controls'

interface Draft {
  id?: string
  createdAt?: number
  name: string
  kind: 'names' | 'number'
  names: string
  count: number
  classKey: string | null
}

const toDraft = (r: Roster): Draft => ({
  id: r.id,
  createdAt: r.createdAt,
  name: r.name,
  kind: r.kind,
  names: r.kind === 'names' ? r.students.join('\n') : '',
  count: r.kind === 'number' ? r.students.length : 30,
  classKey: r.classKey,
})

function RosterEditor({
  draft,
  schools,
  onCancel,
  onSaved,
}: {
  draft: Draft
  schools: School[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [d, setD] = useState(draft)
  const [keyTouched, setKeyTouched] = useState(!!draft.id)
  const schoolMap = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools])
  const classOptions = useMemo(
    () =>
      schools
        .filter((s) => !s.archived)
        .flatMap((s) =>
          [...s.classes]
            .sort((a, b) => a.year - b.year || a.classNumber - b.classNumber)
            .map((c) => ({ key: classKey(s.id, c.year, c.classNumber), label: `${s.name} · ${c.year}-${c.classNumber}` })),
        ),
    [schools],
  )
  const students = d.kind === 'number' ? numberedStudents(d.count) : splitLines(d.names)

  return (
    <form
      className="space-y-4 rounded-2xl border border-accent-muted bg-accent-soft/30 p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        await saveRoster({ id: d.id, createdAt: d.createdAt, name: d.name.trim() || 'Class', kind: d.kind, students, classKey: d.classKey })
        onSaved()
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Class name">
          {(id) => (
            <Input
              id={id}
              autoFocus
              value={d.name}
              placeholder="e.g. 5-1"
              onChange={(e) => {
                const name = e.target.value
                setD((x) => ({ ...x, name, classKey: keyTouched ? x.classKey : matchClassKey(name, schools) }))
              }}
            />
          )}
        </Field>
        <Field label="Planner class" hint="Optional. Links this list to a class in your schedule.">
          {(id) => (
            <Select
              id={id}
              value={d.classKey ?? ''}
              onChange={(e) => {
                setKeyTouched(true)
                setD((x) => ({ ...x, classKey: e.target.value || null }))
              }}
            >
              <option value="">Not linked</option>
              {classOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
              {d.classKey && !classOptions.some((o) => o.key === d.classKey) && (
                <option value={d.classKey}>{classLabel(d.classKey, schoolMap)}</option>
              )}
            </Select>
          )}
        </Field>
      </div>
      <Segmented
        label="List type"
        value={d.kind}
        options={[
          { value: 'names', label: 'Student names' },
          { value: 'number', label: 'Numbers only' },
        ]}
        onChange={(kind) => setD((x) => ({ ...x, kind }))}
      />
      {d.kind === 'names' ? (
        <Field label="Students" hint={`${students.length} names · one per line (you can paste a column from a spreadsheet)`}>
          {(id) => (
            <Textarea id={id} value={d.names} onChange={(e) => setD((x) => ({ ...x, names: e.target.value }))} className="min-h-40" />
          )}
        </Field>
      ) : (
        <Field label="Number of students" hint={`Students are called 1 to ${students.length}.`}>
          {(id) => (
            <Input
              id={id}
              type="number"
              min={1}
              max={200}
              value={d.count}
              onChange={(e) => setD((x) => ({ ...x, count: Math.max(1, Math.min(200, Number(e.target.value) || 1)) }))}
              className="w-32"
            />
          )}
        </Field>
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!students.length}>
          Save class
        </Button>
      </div>
    </form>
  )
}

export function RostersPanel({ rosters, schools }: { rosters: Roster[]; schools: School[] }) {
  const { toast } = useFeedback()
  const [editing, setEditing] = useState<Draft | null>(null)
  const schoolMap = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools])

  const del = async (r: Roster) => {
    const undo = await deleteRoster(r)
    toast(`Deleted “${r.name}”`, { action: { label: 'Undo', onClick: () => void undo() } })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Class lists are shared by Random Name, Group Maker and Spinner, and stay on this device (and in your exports).
      </p>
      {editing ? (
        <RosterEditor
          key={editing.id ?? 'new'}
          draft={editing}
          schools={schools}
          onCancel={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      ) : (
        <Button icon={Plus} variant="primary" onClick={() => setEditing({ name: '', kind: 'names', names: '', count: 30, classKey: null })}>
          Add class
        </Button>
      )}
      {!rosters.length && !editing ? (
        <EmptyState icon={Users} title="No classes yet" description="Add a class once, then pick it in any student widget." />
      ) : (
        <ul className="space-y-2">
          {rosters.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-xl border border-line p-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">{r.name}</span>
                  <Badge>{r.kind === 'number' ? `1–${r.students.length}` : `${r.students.length} students`}</Badge>
                  {r.classKey && (
                    <Badge tone="accent">
                      <Link2 size={11} aria-hidden /> {classLabel(r.classKey, schoolMap)}
                    </Badge>
                  )}
                </div>
                {r.kind === 'names' && <p className="mt-0.5 truncate text-xs text-ink-faint">{r.students.join(', ')}</p>}
              </div>
              <IconButton icon={Pencil} size="sm" label={`Edit ${r.name}`} onClick={() => setEditing(toDraft(r))} />
              <IconButton icon={Trash2} size="sm" label={`Delete ${r.name}`} onClick={() => void del(r)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

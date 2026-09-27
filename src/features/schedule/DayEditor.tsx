import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { CalendarX2, Copy } from 'lucide-react'
import { Button, Dialog, Field, Input, Select, useFeedback } from '@/components/ui'
import { DAY_TYPES, type DayAssignment, type School } from '@/data/schema'
import { cn } from '@/lib/cn'
import { clearDay, copyDay, saveDay, type Undo } from './actions'
import { fromIso, iso } from './model'

interface Props {
  date: string | null
  day: DayAssignment | undefined
  schools: School[]
  periodCount: number
  onClose: () => void
  onUndoable: (message: string, undo: Undo) => void
}

export function DayEditor(props: Props) {
  return props.date ? <DayForm key={props.date} {...props} date={props.date} /> : null
}

function DayForm({ date, day, schools, periodCount, onClose, onUndoable }: Props & { date: string }) {
  const { confirm } = useFeedback()
  const active = schools.filter((s) => !s.archived || s.id === day?.schoolId)
  const [kind, setKind] = useState<'school' | 'off'>(day?.kind ?? 'school')
  const [schoolId, setSchoolId] = useState<string | null>(day?.schoolId ?? active[0]?.id ?? null)
  const [timetableId, setTimetableId] = useState<string | null>(day?.timetableId ?? null)
  const [dayType, setDayType] = useState(day?.dayType ?? 'Public Holiday')
  const [note, setNote] = useState(day?.note ?? '')
  const school = schools.find((s) => s.id === schoolId)

  const submit = async () => {
    const undo = await saveDay({
      date,
      kind,
      schoolId: kind === 'school' ? schoolId : null,
      timetableId: kind === 'school' && school && school.timetables.some((t) => t.id === timetableId) ? timetableId : null,
      dayType: kind === 'off' ? dayType.trim() || 'Other' : null,
      note: note.trim(),
    })
    onUndoable(
      kind === 'school'
        ? `${format(fromIso(date), 'EEE d MMM')}: ${school?.name ?? 'school'}`
        : `${format(fromIso(date), 'EEE d MMM')}: ${dayType}`,
      undo,
    )
    onClose()
  }

  const onClear = async () => {
    const ok =
      periodCount === 0 ||
      (await confirm({
        title: 'Clear this day?',
        message: `The day’s school and its ${periodCount} period${periodCount === 1 ? '' : 's'} are removed. You can undo this.`,
        confirmLabel: 'Clear day',
        danger: true,
      }))
    if (!ok) return
    onUndoable('Day cleared.', await clearDay(date))
    onClose()
  }

  const onCopyNextWeek = async () => {
    const next = iso(addDays(fromIso(date), 7))
    onUndoable(`Copied to ${format(fromIso(next), 'EEE d MMM')} (classes only, without notes).`, await copyDay(date, next))
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={format(fromIso(date), 'EEEE d MMMM yyyy')}
      footer={
        <>
          {day && (
            <Button variant="ghost" icon={CalendarX2} className="mr-auto text-danger hover:text-danger" onClick={onClear}>
              Clear day
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={kind === 'school' && !schoolId}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div role="radiogroup" aria-label="Day type" className="grid grid-cols-2 gap-1 rounded-xl bg-ink/5 p-1">
          {(['school', 'off'] as const).map((k) => (
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
              {k === 'school' ? 'At a school' : 'Holiday, leave or event'}
            </button>
          ))}
        </div>

        {kind === 'school' ? (
          active.length === 0 ? (
            <p className="rounded-xl bg-warning/8 p-3 text-sm text-ink-soft">Add a school on the Schools page first.</p>
          ) : (
            <>
              <div role="radiogroup" aria-label="School" className="grid gap-2 sm:grid-cols-2">
                {active.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={schoolId === s.id}
                    onClick={() => {
                      setSchoolId(s.id)
                      setTimetableId(null)
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                      schoolId === s.id ? 'border-transparent ring-2' : 'border-line hover:bg-canvas',
                    )}
                    style={
                      schoolId === s.id
                        ? { backgroundColor: `color-mix(in oklab, ${s.color} 12%, white)`, ['--tw-ring-color' as string]: s.color }
                        : undefined
                    }
                  >
                    <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                    {s.name}
                  </button>
                ))}
              </div>
              {school && school.timetables.length > 1 && (
                <Field label="Timetable">
                  {(id) => (
                    <Select id={id} value={timetableId ?? school.timetables[0].id} onChange={(e) => setTimetableId(e.target.value)}>
                      {school.timetables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
            </>
          )
        ) : (
          <div className="space-y-3">
            <div role="radiogroup" aria-label="Kind of day" className="flex flex-wrap gap-1.5">
              {DAY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={dayType === t}
                  onClick={() => setDayType(t)}
                  className={cn(
                    'h-9 rounded-xl border px-3 text-sm font-semibold transition-colors',
                    dayType === t
                      ? 'border-accent bg-accent-soft text-accent-strong'
                      : 'border-line bg-surface text-ink-soft hover:bg-canvas',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <Field label="Or describe it">{(id) => <Input id={id} value={dayType} onChange={(e) => setDayType(e.target.value)} />}</Field>
          </div>
        )}

        <Field label="Note for the day" hint="e.g. Sports day practice in the morning">
          {(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>

        {day && (
          <Button variant="subtle" size="sm" icon={Copy} onClick={onCopyNextWeek}>
            Copy this day to next week
          </Button>
        )}
      </div>
    </Dialog>
  )
}

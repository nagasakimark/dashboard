import { useEffect, useRef, useState } from 'react'
import { format, isToday } from 'date-fns'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { DayAssignment, LessonPlan, Period, School, Slot } from '@/data/schema'
import { periodId } from '@/data/schema'
import { cn } from '@/lib/cn'
import { movePeriod, type Undo } from './actions'
import { daySlots, iso, slotTimes, timetableFor } from './model'
import { PeriodCellContent } from './PeriodCell'
import type { PeriodTarget } from './PeriodEditor'

interface Props {
  days: Date[]
  dayMap: Map<string, DayAssignment>
  periods: Map<string, Period>
  schools: Map<string, School>
  plans: Map<string, LessonPlan>
  onEditPeriod: (t: PeriodTarget) => void
  onEditDay: (date: string) => void
  onUndoable: (message: string, undo: Undo) => void
}

/** Drop where the pointer is; fall back to overlap (keyboard dragging). */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length ? hits : rectIntersection(args)
}

/** Tracks whether a copy modifier (Ctrl/Alt/⌘) is held during a drag. */
function useCopyModifier() {
  const held = useRef(false)
  useEffect(() => {
    const on = (e: KeyboardEvent) => (held.current = e.ctrlKey || e.altKey || e.metaKey)
    window.addEventListener('keydown', on)
    window.addEventListener('keyup', on)
    return () => {
      window.removeEventListener('keydown', on)
      window.removeEventListener('keyup', on)
    }
  }, [])
  return held
}

export function WeekView({ days, dayMap, periods, schools, plans, onEditPeriod, onEditDay, onUndoable }: Props) {
  const sensors = useSensors(
    // A small movement threshold keeps clicks working as clicks.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )
  const copyHeld = useCopyModifier()
  const [dragging, setDragging] = useState<Period | null>(null)
  // Days without a school borrow the week's timetable shape so rows line up.
  const shape = days.map((d) => schools.get(dayMap.get(iso(d))?.schoolId ?? '')).find(Boolean)

  const onDragStart = (e: DragStartEvent) => setDragging(periods.get(String(e.active.id)) ?? null)
  const onDragEnd = async (e: DragEndEvent) => {
    setDragging(null)
    if (!e.over) return
    const [date, slotText] = String(e.over.id).split(':')
    const slot: Slot = slotText === 'lunch' ? 'lunch' : Number(slotText)
    const copy = copyHeld.current
    const swapped = periods.has(periodId(date, slot))
    const undo = await movePeriod(String(e.active.id), { date, slot }, copy)
    if (undo) onUndoable(copy ? 'Period copied.' : swapped ? 'Periods swapped.' : 'Period moved.', undo)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'To move a period, press space or enter, use the arrow keys to choose a slot, then press space or enter again. Hold Ctrl to copy.',
        },
      }}
    >
      <div className="grid min-h-0 min-w-0 flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((d) => (
          <DayColumn
            key={iso(d)}
            date={d}
            day={dayMap.get(iso(d))}
            periods={periods}
            schools={schools}
            plans={plans}
            onEditPeriod={onEditPeriod}
            onEditDay={onEditDay}
            shape={shape}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="w-48 rotate-2 rounded-xl border border-line bg-surface shadow-pop">
            <PeriodCellContent
              slot={dragging.slot}
              period={dragging}
              school={schools.get(dayMap.get(dragging.date)?.schoolId ?? '')}
              plans={plans}
              times={null}
              compact
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function DayColumn({
  date,
  day,
  periods,
  schools,
  plans,
  onEditPeriod,
  onEditDay,
  shape,
}: Omit<Props, 'days' | 'dayMap' | 'onUndoable'> & { date: Date; day: DayAssignment | undefined; shape: School | undefined }) {
  const key = iso(date)
  const school = day?.schoolId ? schools.get(day.schoolId) : undefined
  const timetable = timetableFor(school, day)
  const slots = daySlots(school ?? shape)
  // Periods stored in slots this school doesn't have (e.g. P7) still show.
  const extra = [...periods.values()].filter((p) => p.date === key && !slots.includes(p.slot)).map((p) => p.slot)
  const allSlots = [...slots, ...extra]
  const off = day?.kind === 'off'
  const today = isToday(date)

  return (
    <section
      aria-label={format(date, 'EEEE d MMMM')}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-surface shadow-card',
        today ? 'border-accent/50 ring-2 ring-accent/20' : 'border-line',
      )}
    >
      <button
        type="button"
        onClick={() => onEditDay(key)}
        className="group relative border-b border-line px-2 py-2 text-center transition-colors hover:bg-canvas"
        style={school ? { backgroundColor: `color-mix(in oklab, ${school.color} 9%, white)` } : undefined}
        title="Set the school or day type"
      >
        <div className={cn('text-xs font-semibold tracking-wide uppercase', today ? 'text-accent' : 'text-ink-soft')}>
          {format(date, 'EEE')}
        </div>
        <div className={cn('text-lg leading-tight font-bold', today ? 'text-accent' : 'text-ink')}>{format(date, 'd MMM')}</div>
        <div
          className="mt-0.5 truncate text-xs font-semibold"
          style={school ? { color: `color-mix(in oklab, ${school.color} 72%, black)` } : undefined}
        >
          {school ? (
            school.name
          ) : off ? (
            <span className="text-ink-soft">{day?.dayType}</span>
          ) : (
            <span className="font-normal text-ink-faint">Set school…</span>
          )}
        </div>
        {school && school.timetables.length > 1 && timetable && <div className="truncate text-[10px] text-ink-soft">{timetable.name}</div>}
        {day?.note && <div className="mt-0.5 truncate text-[11px] text-ink-soft italic">{day.note}</div>}
      </button>

      {off && extra.length === 0 && !allSlots.some((s) => periods.has(periodId(key, s))) ? (
        <button
          type="button"
          onClick={() => onEditDay(key)}
          className="flex flex-1 items-center justify-center bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,rgb(15_23_42/0.03)_8px,rgb(15_23_42/0.03)_16px)] p-3 text-sm font-semibold text-ink-soft"
        >
          {day?.dayType}
        </button>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col divide-y divide-line">
          {allSlots.map((slot) => (
            <SlotCell
              key={String(slot)}
              date={key}
              slot={slot}
              period={periods.get(periodId(key, slot))}
              school={school}
              plans={plans}
              times={slotTimes(timetable, slot)}
              onEdit={() => onEditPeriod({ date: key, slot })}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function SlotCell({
  date,
  slot,
  period,
  school,
  plans,
  times,
  onEdit,
}: {
  date: string
  slot: Slot
  period: Period | undefined
  school: School | undefined
  plans: Map<string, LessonPlan>
  times: { start: string; end: string } | null
  onEdit: () => void
}) {
  const id = periodId(date, slot)
  const { setNodeRef: dropRef, isOver } = useDroppable({ id })
  const { setNodeRef: dragRef, attributes, listeners, isDragging } = useDraggable({ id, disabled: !period })
  const lunch = slot === 'lunch'

  return (
    <div
      ref={dropRef}
      className={cn(
        'relative min-h-0 overflow-hidden',
        lunch ? 'flex-[0.6]' : 'flex-1',
        isOver && 'bg-accent-soft ring-2 ring-accent/40 ring-inset',
      )}
    >
      <button
        ref={dragRef}
        type="button"
        onClick={onEdit}
        {...(period ? { ...attributes, ...listeners } : {})}
        aria-label={period ? undefined : `Add a period on ${date}, ${lunch ? 'lunch' : `period ${slot}`}`}
        className={cn(
          'group h-full w-full touch-manipulation transition-colors hover:bg-canvas focus-visible:outline-offset-[-2px]',
          lunch && 'bg-warning/4',
          isDragging && 'opacity-30',
        )}
      >
        <PeriodCellContent slot={slot} period={period} school={school} plans={plans} times={times} />
      </button>
    </div>
  )
}

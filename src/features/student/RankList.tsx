import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { cn } from '@/lib/cn'

function Row({ id, index, count, move }: { id: string; index: number; count: number; move: (from: number, to: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-2xl border-2 border-line bg-white p-2 pl-1',
        isDragging && 'z-10 border-accent shadow-pop',
      )}
    >
      <button
        type="button"
        className="grid size-9 shrink-0 touch-none place-items-center text-ink-faint"
        aria-label={`Drag ${id}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} aria-hidden />
      </button>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-white">{index + 1}</span>
      <span className="min-w-0 flex-1 font-semibold">{id}</span>
      <button
        type="button"
        aria-label={`Move ${id} up`}
        disabled={index === 0}
        onClick={() => move(index, index - 1)}
        className="grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-canvas disabled:opacity-30"
      >
        <ChevronUp size={18} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={`Move ${id} down`}
        disabled={index === count - 1}
        onClick={() => move(index, index + 1)}
        className="grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-canvas disabled:opacity-30"
      >
        <ChevronDown size={18} aria-hidden />
      </button>
    </li>
  )
}

/** Drag (mouse, touch, keyboard) or use the arrows to put answers in order. */
export function RankList({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const move = (from: number, to: number) => onChange(arrayMove(items, from, to))
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    move(items.indexOf(String(e.active.id)), items.indexOf(String(e.over.id)))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2" aria-label="Your ranking">
          {items.map((id, i) => (
            <Row key={id} id={id} index={i} count={items.length} move={move} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
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
import { CheckCircle2, Circle, GripVertical, ListTodo, Plus, X } from 'lucide-react'
import { Button, Card, CardHeader, IconButton, Input } from '@/components/ui'
import { db } from '@/data/db'
import { patch, remove, save } from '@/data/repo'
import type { Todo } from '@/data/schema'
import { cn } from '@/lib/cn'

export function TodoList() {
  const todos = useLiveQuery(() => db.todos.orderBy('order').toArray(), [])
  const [text, setText] = useState('')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const open = (todos ?? []).filter((t) => !t.done)
  const done = (todos ?? []).filter((t) => t.done)

  const add = async () => {
    if (!text.trim()) return
    const first = todos?.[0]?.order ?? 0
    await save('todos', { text: text.trim(), done: false, order: first - 1 })
    setText('')
  }

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const ids = open.map((t) => t.id)
    const next = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)))
    await db.transaction('rw', db.todos, async () => {
      for (const [order, id] of next.entries()) await patch('todos', id, { order })
    })
  }

  return (
    <Card>
      <CardHeader
        icon={ListTodo}
        title="To-do"
        description={todos ? `${open.length} open` : undefined}
        actions={
          done.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                remove(
                  'todos',
                  done.map((t) => t.id),
                )
              }
            >
              Clear {done.length} done
            </Button>
          )
        }
      />
      <form
        className="flex gap-2 px-5 pb-3"
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a to-do…" aria-label="New to-do" />
        <IconButton type="submit" icon={Plus} label="Add to-do" variant="primary" disabled={!text.trim()} />
      </form>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={open.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="px-2 pb-3">
            {open.map((t) => (
              <TodoRow key={t.id} todo={t} sortable />
            ))}
            {done.map((t) => (
              <TodoRow key={t.id} todo={t} />
            ))}
            {todos?.length === 0 && <li className="px-3 py-2 text-sm text-ink-faint">Nothing to do. Nice!</li>}
          </ul>
        </SortableContext>
      </DndContext>
    </Card>
  )
}

function TodoRow({ todo, sortable }: { todo: Todo; sortable?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id, disabled: !sortable })
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(todo.text)
  const commit = async () => {
    setEditing(false)
    if (text.trim() && text.trim() !== todo.text) await patch('todos', todo.id, { text: text.trim() })
    else setText(todo.text)
  }
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-1 rounded-xl bg-surface px-1 py-0.5 hover:bg-canvas',
        isDragging && 'relative z-10 shadow-pop',
      )}
    >
      {sortable ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder “${todo.text}”`}
          className="cursor-grab touch-none rounded p-1 text-ink-faint/60 group-hover:opacity-100 focus:opacity-100 [@media(hover:hover)]:opacity-0"
        >
          <GripVertical size={14} />
        </button>
      ) : (
        <span className="w-[22px]" />
      )}
      <button
        type="button"
        aria-pressed={todo.done}
        aria-label={todo.done ? `Mark “${todo.text}” not done` : `Mark “${todo.text}” done`}
        onClick={() => patch('todos', todo.id, { done: !todo.done })}
        className={todo.done ? 'text-success' : 'text-ink-faint hover:text-ink-soft'}
      >
        {todo.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </button>
      {editing ? (
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commit()
            if (e.key === 'Escape') {
              setText(todo.text)
              setEditing(false)
            }
          }}
          aria-label="Edit to-do"
          className="min-w-0 flex-1 rounded-lg border border-accent px-2 py-1 text-sm outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn('min-w-0 flex-1 px-2 py-1.5 text-left text-sm', todo.done ? 'text-ink-faint line-through' : 'text-ink')}
        >
          {todo.text}
        </button>
      )}
      <IconButton
        icon={X}
        label={`Delete “${todo.text}”`}
        size="sm"
        className="size-7 group-hover:opacity-100 focus:opacity-100 [@media(hover:hover)]:opacity-0"
        onClick={() => remove('todos', todo.id)}
      />
    </li>
  )
}

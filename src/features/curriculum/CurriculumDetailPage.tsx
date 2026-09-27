import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
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
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  GripVertical,
  ListChecks,
  MoreVertical,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Menu,
  Select,
  Spinner,
  Tabs,
  useFeedback,
} from '@/components/ui'
import { db } from '@/data/db'
import { patch } from '@/data/repo'
import type { CurriculumItem } from '@/data/schema'
import { useSchools } from '@/features/schedule/hooks'
import { useIsDesktop } from '@/lib/useMediaQuery'
import { cn } from '@/lib/cn'
import { CurriculumEditor } from './CurriculumEditor'
import {
  addItem,
  classPosition,
  deleteCurriculum,
  deleteItem,
  progressIndex,
  reorderItems,
  setTaught,
  trackedClasses,
  type TrackedClass,
} from './model'

type Tab = 'items' | 'progress'

export default function CurriculumDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { confirm, toast } = useFeedback()
  const curriculum = useLiveQuery(() => db.curricula.get(id), [id])
  const items = useLiveQuery(() => db.curriculumItems.where('curriculumId').equals(id).sortBy('order'), [id])
  const progress = useLiveQuery(() => db.classProgress.where('curriculumId').equals(id).toArray(), [id])
  const sections = useLiveQuery(async () => new Map((await db.sections.toArray()).map((s) => [s.id, s])), [])
  const plans = useLiveQuery(async () => new Map((await db.lessonPlans.toArray()).map((p) => [p.id, p])), [])
  const schools = useSchools()
  const [tab, setTab] = useState<Tab>('items')
  const [editing, setEditing] = useState(false)
  const [editItem, setEditItem] = useState<CurriculumItem | null>(null)
  const [text, setText] = useState('')

  const index = useMemo(() => progressIndex(progress ?? []), [progress])
  const classes = useMemo(() => (curriculum && schools ? trackedClasses(curriculum, schools) : []), [curriculum, schools])

  if (curriculum === undefined || !items || !schools)
    return (
      <div className="grid h-64 place-items-center">
        <Spinner />
      </div>
    )
  if (!curriculum)
    return (
      <Page title="Curriculum not found">
        <ButtonLink to="/curriculum" icon={ArrowLeft}>
          All curricula
        </ButtonLink>
      </Page>
    )

  const school = schools.find((s) => s.id === curriculum.schoolId)
  const onDelete = async () => {
    if (
      !(await confirm({
        title: `Delete ${curriculum.name}?`,
        message: 'Its items and class progress are deleted too.',
        confirmLabel: 'Delete',
        danger: true,
      }))
    )
      return
    await deleteCurriculum(curriculum.id)
    toast('Curriculum deleted.')
    navigate('/curriculum')
  }

  return (
    <Page
      title={curriculum.name}
      description={
        [curriculum.year && `Year ${curriculum.year}`, school?.name, curriculum.description].filter(Boolean).join(' · ') || undefined
      }
      actions={
        <>
          <span className="hidden sm:contents">
            <ButtonLink to="/curriculum" variant="ghost" icon={ArrowLeft}>
              All curricula
            </ButtonLink>
          </span>
          <Menu
            trigger={(p) => <IconButton {...p} icon={MoreVertical} label="Curriculum actions" />}
            items={[
              { label: 'Edit details & classes', icon: Pencil, onSelect: () => setEditing(true) },
              'divider',
              { label: 'Delete curriculum', icon: Trash2, danger: true, onSelect: onDelete },
            ]}
          />
        </>
      }
    >
      <Tabs<Tab>
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'items', label: 'Items', icon: ListChecks, count: items.length },
          { id: 'progress', label: 'Class progress', icon: Users, count: classes.length },
        ]}
      />

      {tab === 'items' ? (
        <div className="space-y-3">
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!text.trim()) return
              await addItem(curriculum.id, text)
              setText('')
            }}
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a lesson, unit or topic…"
              aria-label="New item"
            />
            <Button type="submit" variant="primary" icon={Plus} disabled={!text.trim()}>
              Add
            </Button>
          </form>
          {items.length === 0 ? (
            <Card>
              <EmptyState icon={ListChecks} title="No items yet" description="Add what you plan to teach, in order. Drag to reorder." />
            </Card>
          ) : (
            <SortableItems
              items={items}
              render={(item) => {
                const section = item.sectionId ? sections?.get(item.sectionId) : undefined
                const plan = item.lessonPlanId ? plans?.get(item.lessonPlanId) : undefined
                const doneBy = index.get(item.id)?.size ?? 0
                return (
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <button
                      type="button"
                      aria-label={item.completed ? `Mark “${item.text}” not done` : `Mark “${item.text}” done`}
                      aria-pressed={item.completed}
                      onClick={() => patch('curriculumItems', item.id, { completed: !item.completed })}
                      className={cn('shrink-0', item.completed ? 'text-success' : 'text-ink-faint hover:text-ink-soft')}
                    >
                      {item.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                    </button>
                    <button type="button" onClick={() => setEditItem(item)} className="min-w-0 flex-1 text-left">
                      <span className={cn('block font-medium', item.completed ? 'text-ink-faint line-through' : 'text-ink')}>
                        {item.text}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-1.5">
                        {section && (
                          <Badge tone="accent">
                            <BookOpen size={11} /> p.{section.page}
                          </Badge>
                        )}
                        {plan && (
                          <Badge>
                            <NotebookPen size={11} /> {plan.title}
                          </Badge>
                        )}
                        {classes.length > 0 && doneBy > 0 && (
                          <Badge tone={doneBy >= classes.length ? 'success' : 'neutral'}>
                            {doneBy}/{classes.length} classes
                          </Badge>
                        )}
                      </span>
                    </button>
                  </div>
                )
              }}
            />
          )}
        </div>
      ) : (
        <ProgressView items={items} classes={classes} index={index} onEdit={() => setEditing(true)} />
      )}

      {editing && <CurriculumEditor curriculum={curriculum} onClose={() => setEditing(false)} />}
      {editItem && <ItemEditor item={editItem} textbookId={curriculum.textbookId} onClose={() => setEditItem(null)} />}
    </Page>
  )
}

function SortableItems({ items, render }: { items: CurriculumItem[]; render: (i: CurriculumItem) => React.ReactNode }) {
  const [order, setOrder] = useState<string[] | null>(null)
  const ids = order ?? items.map((i) => i.id)
  const byId = new Map(items.map((i) => [i.id, i]))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const next = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)))
    setOrder(next)
    await reorderItems(next)
    setOrder(null)
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <Card className="divide-y divide-line overflow-hidden">
          {ids.map(
            (id, n) =>
              byId.get(id) && (
                <SortableRow key={id} id={id} number={n + 1}>
                  {render(byId.get(id)!)}
                </SortableRow>
              ),
          )}
        </Card>
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({ id, number, children }: { id: string; number: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-center gap-2 bg-surface px-2 py-2.5', isDragging && 'relative z-10 shadow-pop')}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder item ${number}`}
        className="cursor-grab touch-none rounded-lg p-1.5 text-ink-faint hover:bg-ink/5 active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <span className="w-6 shrink-0 text-right text-xs font-semibold text-ink-faint tabular-nums">{number}</span>
      {children}
    </div>
  )
}

function ProgressView({
  items,
  classes,
  index,
  onEdit,
}: {
  items: CurriculumItem[]
  classes: TrackedClass[]
  index: Map<string, Set<string>>
  onEdit: () => void
}) {
  const isDesktop = useIsDesktop()
  const [picked, setPicked] = useState<string | null>(null)
  if (!classes.length)
    return (
      <Card>
        <EmptyState
          icon={Users}
          title="Which classes follow this curriculum?"
          description="Set a year (and school), or choose classes, to track where each class is up to."
          action={
            <Button variant="primary" onClick={onEdit}>
              Choose classes
            </Button>
          }
        />
      </Card>
    )
  if (!items.length) return <p className="text-sm text-ink-faint">Add items first.</p>
  const has = (itemId: string, key: string) => index.get(itemId)?.has(key) ?? false

  if (!isDesktop) {
    const current = classes.find((c) => c.key === picked) ?? classes[0]
    const pos = classPosition(items, index, current.key)
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Class">
          {classes.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={c.key === current.key}
              onClick={() => setPicked(c.key)}
              className={cn(
                'rounded-xl border px-3 py-1.5 text-sm font-bold',
                c.key === current.key ? 'border-transparent text-white' : 'border-line bg-surface',
              )}
              style={c.key === current.key ? { backgroundColor: c.school.color } : { color: c.school.color }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink-soft">
          {pos.done}/{pos.total} done{pos.next ? ` · next: ${pos.next.text}` : ' · finished!'}
        </p>
        <Card className="divide-y divide-line overflow-hidden">
          {items.map((i) => {
            const on = has(i.id, current.key)
            return (
              <button
                key={i.id}
                type="button"
                aria-pressed={on}
                onClick={() => setTaught(i, current.key, !on)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-canvas"
              >
                {on ? (
                  <CheckCircle2 size={22} className="shrink-0 text-success" />
                ) : (
                  <Circle size={22} className="shrink-0 text-ink-faint" />
                )}
                <span className={cn('flex-1 text-sm', on ? 'text-ink-faint' : 'font-medium text-ink')}>{i.text}</span>
              </button>
            )
          })}
        </Card>
      </div>
    )
  }

  return (
    <Card className="overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-canvas">
            <th className="sticky left-0 z-10 bg-canvas px-4 py-2 text-left text-xs font-semibold tracking-wide text-ink-faint uppercase">
              Item
            </th>
            {classes.map((c) => {
              const pos = classPosition(items, index, c.key)
              return (
                <th key={c.key} className="min-w-20 px-2 py-2 text-center" title={pos.next ? `Next: ${pos.next.text}` : 'All done'}>
                  {c.schoolLabel && <span className="block truncate text-[10px] font-medium text-ink-faint">{c.schoolLabel}</span>}
                  <span className="block font-bold" style={{ color: c.school.color }}>
                    {c.label}
                  </span>
                  <span className="block text-[11px] font-medium text-ink-faint">
                    {pos.done}/{pos.total}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((i, n) => (
            <tr key={i.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
              <th scope="row" className="sticky left-0 max-w-80 bg-surface px-4 py-2 text-left font-medium text-ink">
                <span className="mr-2 text-xs text-ink-faint tabular-nums">{n + 1}</span>
                {i.text}
              </th>
              {classes.map((c) => {
                const on = has(i.id, c.key)
                const isNext = classPosition(items, index, c.key).next?.id === i.id
                return (
                  <td key={c.key} className="px-2 py-1 text-center">
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`${i.text} — ${c.schoolLabel ? `${c.schoolLabel} ` : ''}${c.label}`}
                      onClick={() => setTaught(i, c.key, !on)}
                      className={cn(
                        'mx-auto grid size-8 place-items-center rounded-lg transition-colors',
                        on
                          ? 'text-white'
                          : isNext
                            ? 'border-2 border-dashed border-accent/50 hover:bg-accent-soft'
                            : 'border border-line hover:bg-canvas',
                      )}
                      style={on ? { backgroundColor: c.school.color } : undefined}
                    >
                      {on && <Check size={16} strokeWidth={3} />}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function ItemEditor({ item, textbookId, onClose }: { item: CurriculumItem; textbookId: string | null; onClose: () => void }) {
  const [text, setText] = useState(item.text)
  const [bookId, setBookId] = useState<string | null>(textbookId)
  const [sectionId, setSectionId] = useState(item.sectionId)
  const [planId, setPlanId] = useState(item.lessonPlanId)
  const books = useLiveQuery(() => db.textbooks.orderBy('title').toArray(), [])
  const currentSection = useLiveQuery(() => (item.sectionId ? db.sections.get(item.sectionId) : undefined), [item.sectionId])
  const effectiveBook = bookId ?? currentSection?.textbookId ?? null
  const sections = useLiveQuery(
    () => (effectiveBook ? db.sections.where('textbookId').equals(effectiveBook).sortBy('page') : []),
    [effectiveBook],
  )
  const plans = useLiveQuery(() => db.lessonPlans.orderBy('title').toArray(), [])

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit item"
      footer={
        <>
          <Button
            variant="ghost"
            icon={Trash2}
            className="mr-auto text-danger hover:text-danger"
            onClick={async () => {
              await deleteItem(item.id)
              onClose()
            }}
          >
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!text.trim()}
            onClick={async () => {
              await patch('curriculumItems', item.id, { text: text.trim(), sectionId, lessonPlanId: planId })
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Item">{(id) => <Input id={id} value={text} onChange={(e) => setText(e.target.value)} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Textbook">
            {(id) => (
              <Select
                id={id}
                value={effectiveBook ?? ''}
                onChange={(e) => {
                  setBookId(e.target.value || null)
                  setSectionId(null)
                }}
              >
                <option value="">None</option>
                {books?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Page / section">
            {(id) => (
              <Select id={id} value={sectionId ?? ''} disabled={!effectiveBook} onChange={(e) => setSectionId(e.target.value || null)}>
                <option value="">None</option>
                {sections?.map((s) => (
                  <option key={s.id} value={s.id}>
                    p.{s.page} · {s.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Lesson plan">
          {(id) => (
            <Select id={id} value={planId ?? ''} onChange={(e) => setPlanId(e.target.value || null)}>
              <option value="">None</option>
              {plans?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {planId && (
          <Link to={`/lessons/${planId}`} className="text-sm font-semibold text-accent hover:underline">
            Open lesson plan →
          </Link>
        )}
      </div>
    </Dialog>
  )
}

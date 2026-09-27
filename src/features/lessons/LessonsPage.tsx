import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { formatDistanceToNow } from 'date-fns'
import { BookOpen, CheckSquare, NotebookPen, Plus, Printer, Search, Square, X } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Badge, Button, Card, EmptyState, Input, Select, Spinner } from '@/components/ui'
import { db } from '@/data/db'
import { useSchoolMap } from '@/features/schedule/hooks'
import { cn } from '@/lib/cn'
import { allTags, emptyFilters, filterPlans, indexPlans, snippet, type PlanFilters } from './search'

export default function LessonsPage() {
  const navigate = useNavigate()
  const plans = useLiveQuery(() => db.lessonPlans.toArray(), [])
  const textbooks = useLiveQuery(() => db.textbooks.orderBy('title').toArray(), [])
  const sections = useLiveQuery(() => db.sections.toArray(), [])
  const usage = useLiveQuery(async () => {
    const m = new Map<string, number>()
    await db.periods
      .where('lessonPlanId')
      .above('')
      .each((p) => m.set(p.lessonPlanId!, (m.get(p.lessonPlanId!) ?? 0) + 1))
    return m
  }, [])
  const schools = useSchoolMap()
  const [f, setF] = useState<PlanFilters>(emptyFilters)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const indexed = useMemo(() => indexPlans(plans ?? []), [plans])
  const results = useMemo(() => filterPlans(indexed, f), [indexed, f])
  const tags = useMemo(() => allTags(plans ?? []), [plans])
  const books = useMemo(() => new Map((textbooks ?? []).map((t) => [t.id, t])), [textbooks])
  const sectionMap = useMemo(() => new Map((sections ?? []).map((s) => [s.id, s])), [sections])
  const years = useMemo(() => [...new Set((plans ?? []).map((p) => p.year).filter((y): y is number => !!y))].sort((a, b) => a - b), [plans])
  const set = (c: Partial<PlanFilters>) => setF((x) => ({ ...x, ...c }))
  const filtered = f.schoolId || f.year || f.textbookId || f.tag || f.q

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <Page
      title="Lesson plans"
      description={plans ? `${plans.length} plans` : undefined}
      width="wide"
      actions={
        <>
          <span className="hidden sm:contents">
            <Button
              variant="ghost"
              icon={selecting ? X : CheckSquare}
              onClick={() => {
                setSelecting(!selecting)
                setSelected(new Set())
              }}
            >
              {selecting ? 'Cancel' : 'Select to print'}
            </Button>
          </span>
          <Button variant="primary" icon={Plus} onClick={() => navigate('/lessons/new')}>
            <span className="hidden sm:inline">New plan</span>
            <span className="sm:hidden">New</span>
          </Button>
        </>
      }
    >
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search titles, tags and content…"
            aria-label="Search lesson plans"
            className="h-11 pl-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select aria-label="School" value={f.schoolId} onChange={(e) => set({ schoolId: e.target.value })}>
            <option value="">All schools</option>
            {[...schools.values()].map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Year" value={f.year} onChange={(e) => set({ year: e.target.value })}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </Select>
          <Select aria-label="Textbook" value={f.textbookId} onChange={(e) => set({ textbookId: e.target.value })}>
            <option value="">All textbooks</option>
            {textbooks?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
          <Select aria-label="Tag" value={f.tag} onChange={(e) => set({ tag: e.target.value })}>
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        {filtered && (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            {results.length} of {plans?.length ?? 0} plans
            <button type="button" className="font-semibold text-accent" onClick={() => setF(emptyFilters)}>
              Clear filters
            </button>
          </p>
        )}
      </div>

      {!plans ? (
        <div className="grid h-40 place-items-center">
          <Spinner />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <EmptyState
            icon={NotebookPen}
            title="No lesson plans yet"
            description="Write plans once and reuse them. Link them to periods on your schedule and to textbook pages."
            action={
              <Button variant="primary" icon={Plus} onClick={() => navigate('/lessons/new')}>
                Write your first plan
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.map(({ plan, text }) => {
            const school = plan.schoolId ? schools.get(plan.schoolId) : undefined
            const book = plan.textbookId ? books.get(plan.textbookId) : undefined
            const section = plan.sectionId ? sectionMap.get(plan.sectionId) : undefined
            const used = usage?.get(plan.id) ?? 0
            const isSel = selected.has(plan.id)
            const body = (
              <Card
                className={cn(
                  'flex h-full flex-col p-4 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-pop',
                  isSel && 'ring-2 ring-accent',
                )}
              >
                <div className="flex items-start gap-2">
                  {selecting &&
                    (isSel ? (
                      <CheckSquare size={18} className="mt-0.5 shrink-0 text-accent" />
                    ) : (
                      <Square size={18} className="mt-0.5 shrink-0 text-ink-faint" />
                    ))}
                  <h2 className="line-clamp-2 flex-1 font-semibold text-ink">{plan.title}</h2>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plan.year && <Badge>Year {plan.year}</Badge>}
                  {school && <Badge color={school.color}>{school.name}</Badge>}
                  {book && (
                    <Badge tone="accent">
                      <BookOpen size={11} /> {book.title.replace(/\s*\(\d{4}\)$/, '')}
                      {section ? ` p.${section.page}` : ''}
                    </Badge>
                  )}
                </div>
                {text && <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{snippet(text, f.q)}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-xs text-ink-faint">
                  {plan.tags.map((t) => (
                    <span key={t} className="rounded-md bg-ink/5 px-1.5 py-0.5">
                      #{t}
                    </span>
                  ))}
                  <span className="ml-auto">
                    {used ? `Used ${used}× · ` : ''}edited {formatDistanceToNow(plan.updatedAt, { addSuffix: true })}
                  </span>
                </div>
              </Card>
            )
            return selecting ? (
              <button key={plan.id} type="button" aria-pressed={isSel} onClick={() => toggle(plan.id)} className="text-left">
                {body}
              </button>
            ) : (
              <Link key={plan.id} to={`/lessons/${plan.id}`}>
                {body}
              </Link>
            )
          })}
          {results.length === 0 && <p className="col-span-full py-10 text-center text-sm text-ink-faint">No plans match these filters.</p>}
        </div>
      )}

      {selecting && selected.size > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
          <div className="flex items-center gap-3 rounded-2xl bg-ink px-4 py-2.5 text-sm text-white shadow-pop">
            {selected.size} selected
            <Button size="sm" variant="primary" icon={Printer} onClick={() => navigate(`/print/lessons?ids=${[...selected].join(',')}`)}>
              Print
            </Button>
          </div>
        </div>
      )}
    </Page>
  )
}

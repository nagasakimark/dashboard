import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  FileUp,
  Link2,
  Loader2,
  MoreVertical,
  Paperclip,
  Printer,
  Trash2,
  X,
} from 'lucide-react'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Button, ButtonLink, Card, Field, IconButton, Menu, Select, Spinner, TagInput, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { newId, patch, remove, save } from '@/data/repo'
import type { LessonPlan, Resource } from '@/data/schema'
import { useSchools } from '@/features/schedule/hooks'
import { classLabel, fromIso } from '@/features/schedule/model'
import { allTags } from './search'

const MAX_FILE = 1_500_000

/** /lessons/new creates a plan (optionally prefilled/linked) then opens it. */
export default function LessonEditorPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const creating = useRef(false)

  useEffect(() => {
    if (id !== 'new' || creating.current) return
    creating.current = true
    void (async () => {
      const num = (k: string) => (params.get(k) ? Number(params.get(k)) : null)
      const plan = await save('lessonPlans', {
        title: params.get('title') ?? '',
        schoolId: params.get('school'),
        year: num('year'),
        textbookId: params.get('textbook'),
        sectionId: params.get('section'),
        content: '',
        tags: [],
        resources: [],
      })
      const period = params.get('period')
      if (period) await patch('periods', period, { lessonPlanId: plan.id })
      navigate(`/lessons/${plan.id}`, { replace: true, state: { fresh: true } })
    })()
  }, [id, params, navigate])

  const plan = useLiveQuery(() => (id && id !== 'new' ? db.lessonPlans.get(id) : undefined), [id])
  if (id === 'new' || plan === undefined)
    return (
      <div className="grid h-64 place-items-center">
        <Spinner />
      </div>
    )
  if (!plan)
    return (
      <div className="p-6">
        <p className="mb-4 text-ink-soft">That lesson plan doesn’t exist (it may have been deleted).</p>
        <ButtonLink to="/lessons" icon={ArrowLeft}>
          All lesson plans
        </ButtonLink>
      </div>
    )
  return <Editor key={plan.id} plan={plan} />
}

type Draft = Pick<LessonPlan, 'title' | 'schoolId' | 'year' | 'textbookId' | 'sectionId' | 'content' | 'tags' | 'resources'>
const pick = (p: LessonPlan): Draft => ({
  title: p.title,
  schoolId: p.schoolId,
  year: p.year,
  textbookId: p.textbookId,
  sectionId: p.sectionId,
  content: p.content,
  tags: p.tags,
  resources: p.resources,
})

function Editor({ plan }: { plan: LessonPlan }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast, confirm } = useFeedback()
  const [draft, setDraft] = useState<Draft>(() => pick(plan))
  const [status, setStatus] = useState<'saved' | 'saving'>('saved')
  const latest = useRef(draft)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fresh = (location.state as { fresh?: boolean } | null)?.fresh === true

  const schools = useSchools()
  const textbooks = useLiveQuery(() => db.textbooks.orderBy('title').toArray(), [])
  const sections = useLiveQuery(
    () => (draft.textbookId ? db.sections.where('textbookId').equals(draft.textbookId).sortBy('page') : []),
    [draft.textbookId],
  )
  const tags = useLiveQuery(async () => allTags(await db.lessonPlans.toArray()), [])
  const usedIn = useLiveQuery(() => db.periods.where('lessonPlanId').equals(plan.id).reverse().sortBy('date'), [plan.id])
  const schoolById = useMemo(() => new Map((schools ?? []).map((s) => [s.id, s])), [schools])
  const days = useLiveQuery(
    async () => new Map((await db.dayAssignments.bulkGet((usedIn ?? []).map((p) => p.date))).filter(Boolean).map((d) => [d!.date, d!])),
    [usedIn],
  )

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    await patch('lessonPlans', plan.id, latest.current)
    setStatus('saved')
  }

  const update = (changes: Partial<Draft>) => {
    setDraft((d) => {
      const next = { ...d, ...changes }
      latest.current = next
      return next
    })
    setStatus('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, 600)
  }

  // Save on leave; discard brand-new plans that were left completely empty.
  useEffect(
    () => () => {
      const d = latest.current
      const empty = !d.title.trim() && !d.content && !d.tags.length && !d.resources.length
      if (fresh && empty) void remove('lessonPlans', plan.id)
      else if (timer.current) {
        clearTimeout(timer.current)
        void patch('lessonPlans', plan.id, d)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const addLink = () => {
    const url = window.prompt('Link address', 'https://')
    if (!url || url === 'https://') return
    const name = window.prompt('Name for this link', new URL(url, 'https://x').hostname.replace(/^www\./, '')) ?? url
    update({ resources: [...draft.resources, { id: newId(), kind: 'link', name, url }] })
  }
  const addFile = async (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_FILE) return toast('Files must be under 1.5 MB. For bigger files, add a link (e.g. Google Drive).', { tone: 'error' })
    const data = await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = () => rej(r.error)
      r.readAsDataURL(f)
    })
    update({ resources: [...draft.resources, { id: newId(), kind: 'file', name: f.name, url: '', data, mime: f.type }] })
  }

  const duplicate = async () => {
    await flush()
    const copy = await save('lessonPlans', {
      ...latest.current,
      title: `${latest.current.title || 'Untitled'} (copy)`,
      resources: latest.current.resources.map((r) => ({ ...r, id: newId() })),
    })
    navigate(`/lessons/${copy.id}`)
  }
  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete this lesson plan?',
      message: usedIn?.length
        ? `It’s linked to ${usedIn.length} period${usedIn.length === 1 ? '' : 's'}; they’ll keep their notes but lose the link.`
        : undefined,
      confirmLabel: 'Delete plan',
      danger: true,
    })
    if (!ok) return
    for (const p of usedIn ?? []) await patch('periods', p.id, { lessonPlanId: null })
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    await remove('lessonPlans', plan.id)
    latest.current = { ...latest.current, title: 'deleted' }
    toast('Lesson plan deleted.')
    navigate('/lessons')
  }

  const resourceHref = (r: Resource) => (r.kind === 'file' ? r.data : r.url)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
      <div className="mb-3 flex items-center gap-2">
        <Link
          to="/lessons"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-ink-soft hover:bg-ink/5 hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden /> Lesson plans
        </Link>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-faint" role="status">
          {status === 'saving' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {status === 'saving' ? 'Saving…' : 'Saved'}
        </span>
        <Button
          size="sm"
          icon={Printer}
          onClick={async () => {
            await flush()
            navigate(`/print/lessons?ids=${plan.id}`)
          }}
        >
          Print
        </Button>
        <Menu
          trigger={(p) => <IconButton {...p} icon={MoreVertical} label="Plan actions" size="sm" />}
          items={[
            { label: 'Duplicate', icon: Copy, onSelect: duplicate },
            'divider',
            { label: 'Delete plan', icon: Trash2, danger: true, onSelect: onDelete },
          ]}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-3">
          <input
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Lesson title"
            aria-label="Lesson title"
            autoFocus={!plan.title}
            className="w-full bg-transparent text-2xl font-bold tracking-tight text-ink outline-none placeholder:text-ink-faint/60 sm:text-3xl"
          />
          <RichTextEditor value={draft.content} onChange={(content) => update({ content })} />
        </div>

        <aside className="space-y-4">
          <Card className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="School" className="col-span-2">
                {(id) => (
                  <Select id={id} value={draft.schoolId ?? ''} onChange={(e) => update({ schoolId: e.target.value || null })}>
                    <option value="">Any school</option>
                    {schools?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Year">
                {(id) => (
                  <Select
                    id={id}
                    value={draft.year ?? ''}
                    onChange={(e) => update({ year: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">Any</option>
                    {Array.from({ length: 9 }, (_, i) => i + 1).map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Textbook">
                {(id) => (
                  <Select
                    id={id}
                    value={draft.textbookId ?? ''}
                    onChange={(e) => update({ textbookId: e.target.value || null, sectionId: null })}
                  >
                    <option value="">None</option>
                    {textbooks?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              {draft.textbookId && (
                <Field label="Page / section" className="col-span-2">
                  {(id) => (
                    <Select id={id} value={draft.sectionId ?? ''} onChange={(e) => update({ sectionId: e.target.value || null })}>
                      <option value="">Whole textbook</option>
                      {sections?.map((s) => (
                        <option key={s.id} value={s.id}>
                          p.{s.page} · {s.title}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
            </div>
            <Field label="Tags" hint="e.g. review, game, phonics">
              {(id) => <TagInput id={id} value={draft.tags} onChange={(t) => update({ tags: t })} suggestions={tags ?? []} />}
            </Field>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Paperclip size={16} className="text-ink-faint" aria-hidden />
              <h2 className="flex-1 text-sm font-semibold text-ink">Resources</h2>
              <IconButton icon={Link2} label="Add a link" size="sm" onClick={addLink} />
              <label
                className="grid size-8 cursor-pointer place-items-center rounded-lg text-ink-soft hover:bg-ink/5"
                title="Attach a small file"
              >
                <FileUp size={16} aria-hidden />
                <span className="sr-only">Attach a file</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    void addFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
            {draft.resources.length === 0 ? (
              <p className="text-sm text-ink-faint">Worksheets, slides, videos…</p>
            ) : (
              <ul className="space-y-1">
                {draft.resources.map((r) => (
                  <li key={r.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-canvas">
                    {r.kind === 'file' ? (
                      <Paperclip size={14} className="shrink-0 text-ink-faint" />
                    ) : (
                      <ExternalLink size={14} className="shrink-0 text-ink-faint" />
                    )}
                    <a
                      href={resourceHref(r)}
                      {...(r.kind === 'file' ? { download: r.name } : { target: '_blank', rel: 'noreferrer' })}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-accent hover:underline"
                    >
                      {r.name}
                    </a>
                    <IconButton
                      icon={X}
                      label={`Remove ${r.name}`}
                      size="sm"
                      className="size-6 opacity-60 group-hover:opacity-100"
                      onClick={() => update({ resources: draft.resources.filter((x) => x.id !== r.id) })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <CalendarDays size={16} className="text-ink-faint" aria-hidden />
              <h2 className="text-sm font-semibold text-ink">
                Used in {usedIn?.length ? `${usedIn.length} class${usedIn.length === 1 ? '' : 'es'}` : 'no classes yet'}
              </h2>
            </div>
            <ul className="space-y-1">
              {usedIn?.slice(0, 12).map((p) => {
                const school = schoolById.get(days?.get(p.date)?.schoolId ?? '')
                return (
                  <li key={p.id}>
                    <Link
                      to={`/schedule?v=week&d=${p.date}`}
                      className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm hover:bg-canvas"
                    >
                      <span className="w-20 shrink-0 text-ink-faint">{format(fromIso(p.date), 'd MMM yy')}</span>
                      <span className="font-bold" style={{ color: school?.color }}>
                        {classLabel(p)}
                      </span>
                      <span className="truncate text-ink-soft">{school?.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            {!usedIn?.length && <p className="text-sm text-ink-faint">Link it from a period on your schedule.</p>}
          </Card>
        </aside>
      </div>
    </div>
  )
}

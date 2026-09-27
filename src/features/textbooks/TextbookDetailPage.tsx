import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileJson,
  GraduationCap,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Menu,
  Select,
  Spinner,
  Textarea,
  useFeedback,
  ButtonLink,
} from '@/components/ui'
import { TEXTBOOK_PRESETS } from '@/content/textbookPresets'
import { db } from '@/data/db'
import { shrinkImage } from '@/data/images'
import { patch, remove, save } from '@/data/repo'
import type { Section, Textbook } from '@/data/schema'
import { addSections, deleteTextbook, fillFromPreset, parseSectionsJson, presetById, suggestPreset } from './actions'
import { TextbookCover } from './TextbookCover'

export default function TextbookDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast, confirm } = useFeedback()
  const book = useLiveQuery(() => db.textbooks.get(id), [id])
  const sections = useLiveQuery(() => db.sections.where('textbookId').equals(id).sortBy('page'), [id])
  const planCounts = useLiveQuery(async () => {
    const m = new Map<string, number>()
    for (const p of await db.lessonPlans.where('textbookId').equals(id).toArray())
      if (p.sectionId) m.set(p.sectionId, (m.get(p.sectionId) ?? 0) + 1)
    return m
  }, [id])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [section, setSection] = useState<Section | 'new' | null>(null)
  const [filling, setFilling] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (sections ?? []).filter((s) => !q || `${s.page} ${s.title} ${s.topic} ${s.notes}`.toLowerCase().includes(q))
  }, [sections, query])

  if (book === undefined || !sections)
    return (
      <div className="grid h-64 place-items-center">
        <Spinner />
      </div>
    )
  if (book === null || !book)
    return (
      <Page title="Textbook not found">
        <ButtonLink to="/textbooks" icon={ArrowLeft}>
          Back to textbooks
        </ButtonLink>
      </Page>
    )

  const suggestion = !book.preset ? suggestPreset(book.title) : undefined

  const onImport = async (f: File | undefined) => {
    if (!f) return
    try {
      const added = await addSections(book.id, parseSectionsJson(JSON.parse(await f.text())))
      toast(`Imported ${added} section${added === 1 ? '' : 's'}.`, { tone: 'success' })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read that file.', { tone: 'error' })
    }
  }

  const onDelete = async () => {
    const ok = await confirm({
      title: `Delete ${book.title}?`,
      message: `Its ${sections.length} sections are deleted too. Lesson plans that use it are kept but unlinked.`,
      confirmLabel: 'Delete textbook',
      danger: true,
    })
    if (!ok) return
    await deleteTextbook(book.id)
    toast(`${book.title} deleted.`)
    navigate('/textbooks')
  }

  return (
    <Page
      title={book.title}
      description={`${sections.length} sections${book.preset ? ` · ${presetById(book.preset)?.title ?? ''} preset` : ''}`}
      actions={
        <>
          <span className="hidden sm:contents">
            <ButtonLink to="/textbooks" variant="ghost" icon={ArrowLeft}>
              All textbooks
            </ButtonLink>
          </span>
          <Menu
            trigger={(p) => <IconButton {...p} icon={MoreVertical} label="Textbook actions" />}
            items={[
              { label: 'Edit details', icon: Pencil, onSelect: () => setEditing(true) },
              { label: 'Fill sections from preset…', icon: Sparkles, onSelect: () => setFilling(true) },
              { label: 'Import sections (JSON)…', icon: FileJson, onSelect: () => fileInput.current?.click() },
              'divider',
              { label: 'Delete textbook', icon: Trash2, danger: true, onSelect: onDelete },
            ]}
          />
        </>
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          void onImport(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <div className="grid gap-6 md:grid-cols-[11rem_1fr]">
        <aside className="space-y-3">
          <TextbookCover book={book} className="mx-auto max-w-44" />
          <div className="flex flex-col gap-2">
            {book.digitalUrl && (
              <ButtonLink href={book.digitalUrl} icon={BookOpen} iconRight={ExternalLink} className="w-full">
                Digital textbook
              </ButtonLink>
            )}
            {book.altopediaUrl && (
              <ButtonLink href={book.altopediaUrl} variant="ghost" iconRight={ExternalLink} className="w-full">
                ALTopedia
              </ButtonLink>
            )}
            {/^nh[123]-/.test(book.preset ?? '') && (
              <ButtonLink to={`/jhs?book=${book.preset!.split('-')[0]}`} variant="subtle" icon={GraduationCap} className="w-full">
                JHS exercises
              </ButtonLink>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          {suggestion && sections.length === 0 && (
            <Card className="flex flex-col gap-3 border-accent/30 bg-accent-soft/40 p-4 sm:flex-row sm:items-center">
              <Sparkles size={20} className="shrink-0 text-accent" aria-hidden />
              <p className="flex-1 text-sm text-ink">
                This looks like <strong>{suggestion.title}</strong>. Fill in all {suggestion.sections.length} key-sentence pages from the
                preset?
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  const n = await fillFromPreset(book.id, suggestion.id)
                  toast(`Added ${n} sections.`, { tone: 'success' })
                }}
              >
                Fill sections
              </Button>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, grammar, notes…"
                aria-label="Search sections"
                className="pl-9"
              />
            </div>
            <Button icon={Plus} onClick={() => setSection('new')}>
              Add section
            </Button>
          </div>

          {sections.length === 0 ? (
            <Card>
              <EmptyState
                icon={BookOpen}
                title="No sections yet"
                description="Sections are pages or units you teach from. Add them one by one, import a JSON list, or fill them from a preset."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button icon={Sparkles} onClick={() => setFilling(true)}>
                      From preset
                    </Button>
                    <Button icon={Upload} onClick={() => fileInput.current?.click()}>
                      Import JSON
                    </Button>
                  </div>
                }
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-line">
                {shown.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSection(s)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-canvas"
                    >
                      <span className="w-12 shrink-0 pt-0.5 text-right text-sm font-bold text-ink-faint tabular-nums">p.{s.page}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-ink">{s.title}</span>
                        {(s.topic || s.notes) && (
                          <span className="block truncate text-sm text-ink-soft">{[s.topic, s.notes].filter(Boolean).join(' · ')}</span>
                        )}
                      </span>
                      {!!planCounts?.get(s.id) && (
                        <Badge tone="accent">
                          {planCounts.get(s.id)} plan{planCounts.get(s.id) === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </button>
                  </li>
                ))}
                {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-faint">No sections match “{query}”.</li>}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {editing && <TextbookEditor book={book} onClose={() => setEditing(false)} />}
      {filling && (
        <FillDialog
          book={book}
          onClose={() => setFilling(false)}
          onDone={(n) => toast(n ? `Added ${n} sections.` : 'All of that preset’s sections are already here.', { tone: 'success' })}
        />
      )}
      {section && <SectionEditor book={book} section={section === 'new' ? null : section} onClose={() => setSection(null)} />}
    </Page>
  )
}

function TextbookEditor({ book, onClose }: { book: Textbook; onClose: () => void }) {
  const [d, setD] = useState(book)
  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit textbook"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!d.title.trim()}
            onClick={async () => {
              await patch('textbooks', book.id, {
                title: d.title.trim(),
                cover: d.cover,
                digitalUrl: d.digitalUrl.trim(),
                altopediaUrl: d.altopediaUrl.trim(),
              })
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div>
          <TextbookCover book={d} />
          <div className="mt-2 flex justify-center gap-2 text-xs font-semibold">
            <label className="cursor-pointer text-accent">
              {d.cover ? 'Change' : 'Add'} cover
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const cover = await shrinkImage(f)
                  setD((x) => ({ ...x, cover }))
                }}
              />
            </label>
            {d.cover && (
              <button type="button" className="text-ink-faint" onClick={() => setD({ ...d, cover: '' })}>
                Remove
              </button>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Title">{(id) => <Input id={id} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />}</Field>
          <Field label="Digital textbook link">
            {(id) => <Input id={id} type="url" value={d.digitalUrl} onChange={(e) => setD({ ...d, digitalUrl: e.target.value })} />}
          </Field>
          <Field label="ALTopedia link">
            {(id) => <Input id={id} type="url" value={d.altopediaUrl} onChange={(e) => setD({ ...d, altopediaUrl: e.target.value })} />}
          </Field>
        </div>
      </div>
    </Dialog>
  )
}

function FillDialog({ book, onClose, onDone }: { book: Textbook; onClose: () => void; onDone: (added: number) => void }) {
  const [presetId, setPresetId] = useState(book.preset ?? suggestPreset(book.title)?.id ?? TEXTBOOK_PRESETS[0].id)
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Fill sections from a preset"
      description="Adds the preset’s pages. Sections you already have are left alone."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              onDone(await fillFromPreset(book.id, presetId))
              onClose()
            }}
          >
            Add sections
          </Button>
        </>
      }
    >
      <Field label="Preset">
        {(id) => (
          <Select id={id} value={presetId} onChange={(e) => setPresetId(e.target.value)}>
            {TEXTBOOK_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.sections.length} pages)
              </option>
            ))}
          </Select>
        )}
      </Field>
    </Dialog>
  )
}

function SectionEditor({ book, section, onClose }: { book: Textbook; section: Section | null; onClose: () => void }) {
  const navigate = useNavigate()
  const [d, setD] = useState({
    page: section?.page ?? 0,
    title: section?.title ?? '',
    topic: section?.topic ?? '',
    notes: section?.notes ?? '',
    digitalUrl: section?.digitalUrl ?? '',
    altopediaUrl: section?.altopediaUrl ?? '',
  })
  const plans = useLiveQuery(() => (section ? db.lessonPlans.where('sectionId').equals(section.id).toArray() : []), [section?.id])

  const onSave = async () => {
    if (!d.title.trim()) return
    if (section) await patch('sections', section.id, { ...d, title: d.title.trim() })
    else {
      const count = await db.sections.where('textbookId').equals(book.id).count()
      await save('sections', { ...d, title: d.title.trim(), textbookId: book.id, order: count })
    }
    onClose()
  }

  const newPlan = async () => {
    if (!section) return
    const plan = await save('lessonPlans', {
      title: `${book.title.replace(/\s*\(\d{4}\)$/, '')} p.${section.page}: ${section.title}`,
      schoolId: null,
      year: presetById(book.preset)?.year ?? null,
      textbookId: book.id,
      sectionId: section.id,
      content: '',
      tags: [],
      resources: [],
    })
    navigate(`/lessons/${plan.id}`)
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={section ? `p.${section.page} · ${section.title}` : 'Add a section'}
      footer={
        <>
          {section && (
            <Button
              variant="ghost"
              icon={Trash2}
              className="mr-auto text-danger hover:text-danger"
              onClick={async () => {
                await remove('sections', section.id)
                onClose()
              }}
            >
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave} disabled={!d.title.trim()}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
        <Field label="Page">
          {(id) => (
            <Input id={id} type="number" min={0} value={d.page || ''} onChange={(e) => setD({ ...d, page: Number(e.target.value) || 0 })} />
          )}
        </Field>
        <Field label="Title / key sentence">
          {(id) => <Input id={id} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />}
        </Field>
        <Field label="Grammar / topic" className="sm:col-span-2">
          {(id) => <Input id={id} value={d.topic} onChange={(e) => setD({ ...d, topic: e.target.value })} />}
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          {(id) => <Textarea id={id} rows={3} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />}
        </Field>
        <Field label="Digital page link" className="sm:col-span-2">
          {(id) => <Input id={id} type="url" value={d.digitalUrl} onChange={(e) => setD({ ...d, digitalUrl: e.target.value })} />}
        </Field>
        <Field label="ALTopedia page" className="sm:col-span-2">
          {(id) => (
            <div className="flex gap-2">
              <Input id={id} type="url" value={d.altopediaUrl} onChange={(e) => setD({ ...d, altopediaUrl: e.target.value })} />
              {d.altopediaUrl && (
                <ButtonLink
                  href={d.altopediaUrl}
                  icon={ExternalLink}
                  aria-label="Open ALTopedia activities"
                  title="Open ALTopedia activities"
                  className="w-10 px-0"
                />
              )}
            </div>
          )}
        </Field>
      </div>
      {section && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Lesson plans for this section</h3>
            <Button size="sm" variant="subtle" icon={Plus} onClick={newPlan}>
              New plan
            </Button>
          </div>
          {plans?.length ? (
            <ul className="space-y-1">
              {plans.map((p) => (
                <li key={p.id}>
                  <Link to={`/lessons/${p.id}`} className="text-sm font-medium text-accent hover:underline">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">None yet.</p>
          )}
        </div>
      )}
    </Dialog>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, BookPlus, Check, Plus, Upload } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Badge, Button, Card, Dialog, EmptyState, Field, Input, Spinner, Tabs, useFeedback } from '@/components/ui'
import { TEXTBOOK_PRESETS } from '@/content/textbookPresets'
import { db } from '@/data/db'
import { shrinkImage } from '@/data/images'
import { save } from '@/data/repo'
import type { Textbook } from '@/data/schema'
import { blankTextbook, createFromPreset } from './actions'
import { TextbookCover } from './TextbookCover'

export default function TextbooksPage() {
  const books = useLiveQuery(() => db.textbooks.orderBy('title').toArray(), [])
  const counts = useLiveQuery(async () => {
    const m = new Map<string, number>()
    await db.sections.each((s) => m.set(s.textbookId, (m.get(s.textbookId) ?? 0) + 1))
    return m
  }, [])
  const [adding, setAdding] = useState(false)

  return (
    <Page
      title="Textbooks"
      description="Textbooks, their sections and links."
      actions={
        <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
          <span className="hidden sm:inline">Add textbook</span>
          <span className="sm:hidden">Add</span>
        </Button>
      }
    >
      {!books ? (
        <div className="grid h-40 place-items-center">
          <Spinner />
        </div>
      ) : books.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No textbooks yet"
            description="Add New Horizon 1–3 in one click (with every page's key sentence) or add your own."
            action={
              <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
                Add a textbook
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {books.map((b) => (
            <Link key={b.id} to={`/textbooks/${b.id}`} className="group">
              <TextbookCover book={b} className="transition-transform group-hover:-translate-y-1 group-hover:shadow-pop" />
              <p className="mt-2 line-clamp-2 text-sm font-semibold text-ink">{b.title}</p>
              <p className="text-xs text-ink-faint">{counts?.get(b.id) ?? 0} sections</p>
            </Link>
          ))}
        </div>
      )}
      {adding && <AddTextbookDialog existing={books ?? []} onClose={() => setAdding(false)} />}
    </Page>
  )
}

function AddTextbookDialog({ existing, onClose }: { existing: Textbook[]; onClose: () => void }) {
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const [tab, setTab] = useState<'preset' | 'custom'>('preset')
  const [draft, setDraft] = useState(blankTextbook())
  const [busy, setBusy] = useState(false)
  const have = new Set(existing.map((b) => b.preset))

  const addPreset = async (id: string) => {
    setBusy(true)
    const book = await createFromPreset(id)
    toast(`${book.title} added.`, { tone: 'success' })
    onClose()
    navigate(`/textbooks/${book.id}`)
  }

  const addCustom = async () => {
    if (!draft.title.trim()) return
    const book = await save('textbooks', { ...draft, title: draft.title.trim() })
    onClose()
    navigate(`/textbooks/${book.id}`)
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Add a textbook"
      footer={
        tab === 'custom' && (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={addCustom} disabled={!draft.title.trim()}>
              Add textbook
            </Button>
          </>
        )
      }
    >
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'preset', label: 'New Horizon (2025)', icon: BookPlus },
          { id: 'custom', label: 'Other textbook', icon: BookOpen },
        ]}
      />
      {tab === 'preset' ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {TEXTBOOK_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy || have.has(p.id)}
                onClick={() => addPreset(p.id)}
                className="group rounded-2xl border border-line p-3 text-left transition-colors hover:border-accent hover:bg-accent-soft/40 disabled:cursor-default disabled:opacity-60"
              >
                <TextbookCover book={{ title: p.title, cover: '' }} className="mb-3" />
                <p className="font-semibold text-ink">{p.title}</p>
                <p className="text-xs text-ink-faint">{p.sections.length} key-sentence pages</p>
                {have.has(p.id) && (
                  <Badge tone="success" className="mt-2">
                    <Check size={12} /> Added
                  </Badge>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-faint">
            Page numbers, key sentences and grammar points come from{' '}
            <a className="underline" href="https://www.altopedia.net/jhs" target="_blank" rel="noreferrer">
              ALTopedia
            </a>
            , with a link to each page’s activities. Already have one of these textbooks? Open it and use “Fill sections from preset”.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <label className="block cursor-pointer">
            <TextbookCover book={{ title: draft.title || 'Cover', cover: draft.cover }} />
            <span className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-accent">
              <Upload size={13} /> {draft.cover ? 'Change' : 'Add'} cover
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const cover = await shrinkImage(f)
                setDraft((d) => ({ ...d, cover }))
              }}
            />
          </label>
          <div className="space-y-4">
            <Field label="Title">
              {(id) => <Input id={id} autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />}
            </Field>
            <Field label="Digital textbook link">
              {(id) => (
                <Input
                  id={id}
                  type="url"
                  placeholder="https://…"
                  value={draft.digitalUrl}
                  onChange={(e) => setDraft({ ...draft, digitalUrl: e.target.value })}
                />
              )}
            </Field>
            <Field label="ALTopedia link">
              {(id) => (
                <Input
                  id={id}
                  type="url"
                  placeholder="https://www.altopedia.net/textbooks/…"
                  value={draft.altopediaUrl}
                  onChange={(e) => setDraft({ ...draft, altopediaUrl: e.target.value })}
                />
              )}
            </Field>
          </div>
        </div>
      )}
    </Dialog>
  )
}

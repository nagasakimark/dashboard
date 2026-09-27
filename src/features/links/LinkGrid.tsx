import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, Check, ExternalLink, Globe, ImagePlus, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button, Dialog, EmptyState, Field, IconButton, Input, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { shrinkImage } from '@/data/images'
import type { Bookmark } from '@/data/schema'
import { cn } from '@/lib/cn'
import { deleteLink, ensureActivities, kindOf, moveLink, restoreActivities, saveLink, type LinkKind } from './actions'

function LinkEditor({ link, kind, onClose }: { link: Bookmark | null; kind: LinkKind; onClose: () => void }) {
  const [name, setName] = useState(link?.name ?? '')
  const [url, setUrl] = useState(link?.url ?? '')
  const [image, setImage] = useState(link?.image ?? '')
  const file = useRef<HTMLInputElement>(null)
  return (
    <Dialog
      open
      onClose={onClose}
      title={link ? 'Edit link' : kind === 'activity' ? 'Add activity' : 'Add bookmark'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!name.trim() || !url.trim()}
            onClick={async () => {
              await saveLink({ ...(link ?? {}), name: name.trim(), url, image, kind })
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          {(id) => <Input id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wordle" />}
        </Field>
        <Field label="Link">
          {(id) => <Input id={id} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />}
        </Field>
        <Field label="Picture" hint="Optional. Paste an image link or upload one.">
          {(id) => (
            <div className="flex items-center gap-2">
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-canvas ring-1 ring-line">
                {image ? <img src={image} alt="" className="size-full object-cover" /> : <Globe className="text-ink-faint" aria-hidden />}
              </span>
              <Input
                id={id}
                value={image.startsWith('data:') ? '(uploaded picture)' : image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://…/picture.png"
              />
              <IconButton icon={ImagePlus} label="Upload a picture" onClick={() => file.current?.click()} />
              <input
                ref={file}
                type="file"
                accept="image/*"
                hidden
                aria-label="Upload picture file"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (f) setImage(await shrinkImage(f, 320))
                }}
              />
            </div>
          )}
        </Field>
      </div>
    </Dialog>
  )
}

/** Activities or bookmarks as picture tiles; "Edit" reveals add, reorder, edit and delete. */
export function LinkGrid({ kind, compact = false }: { kind: LinkKind; compact?: boolean }) {
  const { toast } = useFeedback()
  const [editing, setEditing] = useState(false)
  const [editor, setEditor] = useState<Bookmark | 'new' | null>(null)
  const links = useLiveQuery(async () => (await db.bookmarks.orderBy('order').toArray()).filter((b) => kindOf(b) === kind), [kind])

  useEffect(() => {
    if (kind === 'activity') void ensureActivities()
  }, [kind])

  const del = async (b: Bookmark) => {
    const undo = await deleteLink(b)
    toast(`Removed “${b.name}”`, { action: { label: 'Undo', onClick: () => void undo() } })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={editing ? 'primary' : 'secondary'} icon={editing ? Check : Pencil} onClick={() => setEditing((e) => !e)}>
          {editing ? 'Done' : 'Edit'}
        </Button>
        {editing && (
          <Button size="sm" icon={Plus} onClick={() => setEditor('new')}>
            {kind === 'activity' ? 'Add activity' : 'Add bookmark'}
          </Button>
        )}
        {editing && kind === 'activity' && (
          <Button
            size="sm"
            variant="ghost"
            icon={RotateCcw}
            onClick={async () => {
              const n = await restoreActivities()
              toast(n ? `Added ${n} activities back.` : 'All the default activities are already here.')
            }}
          >
            Restore defaults
          </Button>
        )}
      </div>
      {links && !links.length ? (
        <EmptyState
          icon={Globe}
          title={kind === 'activity' ? 'No activities' : 'No bookmarks yet'}
          description={
            kind === 'activity'
              ? 'Use Restore defaults, or add your own.'
              : 'Save the sites you open in class, with a picture to spot them fast.'
          }
          action={
            <Button
              icon={Plus}
              onClick={() => {
                setEditing(true)
                setEditor('new')
              }}
            >
              Add
            </Button>
          }
        />
      ) : (
        <ul className={cn('grid gap-3', compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6')}>
          {links?.map((b, i) => (
            <li key={b.id} className="group relative">
              <a
                href={b.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'flex flex-col gap-1.5 rounded-2xl bg-surface p-2 shadow-sm ring-1 ring-line transition-all hover:-translate-y-0.5 hover:shadow-pop hover:ring-accent-muted',
                  editing && 'pointer-events-none opacity-70',
                )}
                tabIndex={editing ? -1 : undefined}
              >
                <span className="block aspect-[3/2] overflow-hidden rounded-xl bg-canvas">
                  {b.image ? (
                    <img src={b.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-2xl font-black text-accent/40">{b.name[0]}</span>
                  )}
                </span>
                <span className="flex items-center gap-1 px-0.5 text-xs leading-tight font-bold">
                  <span className="line-clamp-2 flex-1">{b.name}</span>
                  <ExternalLink size={11} className="shrink-0 text-ink-faint" aria-hidden />
                </span>
              </a>
              {editing && (
                <div className="absolute inset-x-1 top-1 flex justify-between gap-0.5">
                  <span className="flex gap-0.5">
                    <IconButton
                      icon={ArrowUp}
                      size="sm"
                      variant="secondary"
                      label={`Move ${b.name} earlier`}
                      disabled={i === 0}
                      onClick={() => void moveLink(links, b.id, -1)}
                      className="size-7"
                    />
                    <IconButton
                      icon={ArrowDown}
                      size="sm"
                      variant="secondary"
                      label={`Move ${b.name} later`}
                      disabled={i === links.length - 1}
                      onClick={() => void moveLink(links, b.id, 1)}
                      className="size-7"
                    />
                  </span>
                  <span className="flex gap-0.5">
                    <IconButton
                      icon={Pencil}
                      size="sm"
                      variant="secondary"
                      label={`Edit ${b.name}`}
                      onClick={() => setEditor(b)}
                      className="size-7"
                    />
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      variant="secondary"
                      label={`Remove ${b.name}`}
                      onClick={() => void del(b)}
                      className="size-7"
                    />
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editor && <LinkEditor link={editor === 'new' ? null : editor} kind={kind} onClose={() => setEditor(null)} />}
    </div>
  )
}

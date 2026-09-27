import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Plus, Trash2, Upload, X } from 'lucide-react'
import { Button, Dialog, IconButton, Input, Textarea, useFeedback } from '@/components/ui'
import { shrinkImage } from '@/data/images'
import { save } from '@/data/repo'
import type { VocabCard, VocabSet } from '@/data/schema'
import { imageLibrary, imageUrl } from './data'

type Row = VocabCard & { key: string }
const row = (c: Partial<VocabCard> = {}): Row => ({ key: crypto.randomUUID(), en: '', ja: '', kana: '', img: '', ...c })

/** Pick a picture: search the built-in library, or upload one (shrunk to 320 px). */
function ImagePicker({ word, onPick, onClose }: { word: string; onPick: (img: string) => void; onClose: () => void }) {
  const [library, setLibrary] = useState<{ en: string; img: string }[] | null>(null)
  const [q, setQ] = useState(word)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => {
    void imageLibrary().then(setLibrary)
  }, [])
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!library) return []
    return (t ? library.filter((x) => x.en.toLowerCase().includes(t) || x.img.includes(t)) : library).slice(0, 60)
  }, [library, q])
  return (
    <Dialog open onClose={onClose} title="Choose a picture" size="lg">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            autoFocus
            aria-label="Search pictures"
            placeholder="Search 1,000+ pictures"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button icon={Upload} onClick={() => file.current?.click()}>
            Upload
          </Button>
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            aria-label="Upload a picture"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) onPick(await shrinkImage(f, 320))
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {matches.map((m) => (
            <button
              key={m.img}
              type="button"
              onClick={() => onPick(m.img)}
              className="overflow-hidden rounded-xl border border-line bg-white p-1 text-xs font-semibold hover:border-accent"
            >
              <img src={imageUrl(m.img)} alt="" loading="lazy" className="aspect-[4/3] w-full object-contain" />
              <span className="block truncate">{m.en}</span>
            </button>
          ))}
        </div>
        {library && !matches.length && <p className="text-sm text-ink-soft">No pictures match. Try another word, or upload your own.</p>}
      </div>
    </Dialog>
  )
}

export function CustomSetEditor({ set, onClose }: { set: VocabSet | null; onClose: () => void }) {
  const { toast } = useFeedback()
  const [name, setName] = useState(set?.name ?? '')
  const [rows, setRows] = useState<Row[]>(() => (set?.cards.length ? set.cards.map(row) : [row(), row(), row(), row()]))
  const [paste, setPaste] = useState('')
  const [picking, setPicking] = useState<string | null>(null)
  const change = (key: string, c: Partial<VocabCard>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...c } : r)))
  const cards = rows.filter((r) => r.en.trim()).map(({ key: _key, ...c }) => ({ ...c, en: c.en.trim(), ja: c.ja.trim() }))

  const addPasted = () => {
    const added = paste
      .split(/\r?\n/)
      .map((l) => l.split(/\t|,|、/).map((s) => s.trim()))
      .filter(([en]) => en)
      .map(([en, ja = '']) => row({ en, ja }))
    setRows((rs) => [...rs.filter((r) => r.en.trim()), ...added])
    setPaste('')
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={set ? 'Edit word set' : 'New word set'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!name.trim() || !cards.length}
            onClick={async () => {
              await save('vocabSets', { ...(set ?? {}), name: name.trim(), cards })
              toast(`Saved “${name.trim()}”`, { tone: 'success' })
              onClose()
            }}
          >
            Save set
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input aria-label="Set name" placeholder="Set name, e.g. 5-1 Unit 3 words" value={name} onChange={(e) => setName(e.target.value)} />
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPicking(r.key)}
                aria-label={r.img ? `Change picture for ${r.en || `word ${i + 1}`}` : `Add a picture for ${r.en || `word ${i + 1}`}`}
                className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-canvas text-ink-faint hover:border-accent"
              >
                {r.img ? <img src={imageUrl(r.img)} alt="" className="size-full object-contain" /> : <ImagePlus size={18} aria-hidden />}
              </button>
              <Input
                aria-label={`English ${i + 1}`}
                placeholder="English"
                value={r.en}
                onChange={(e) => change(r.key, { en: e.target.value })}
                className="h-10"
              />
              <Input
                aria-label={`Japanese ${i + 1}`}
                placeholder="日本語 (optional)"
                lang="ja"
                value={r.ja}
                onChange={(e) => change(r.key, { ja: e.target.value })}
                className="h-10"
              />
              {r.img && <IconButton icon={X} size="sm" label="Remove picture" onClick={() => change(r.key, { img: '' })} />}
              <IconButton
                icon={Trash2}
                size="sm"
                label={`Remove word ${i + 1}`}
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              />
            </li>
          ))}
        </ul>
        <Button size="sm" icon={Plus} onClick={() => setRows((rs) => [...rs, row()])}>
          Add word
        </Button>
        <details className="rounded-2xl bg-canvas p-3">
          <summary className="cursor-pointer text-sm font-semibold">Paste a list</summary>
          <p className="mt-2 text-xs text-ink-soft">One word per line. Add Japanese after a comma or tab, e.g. “apple, りんご”.</p>
          <Textarea aria-label="Paste words" value={paste} onChange={(e) => setPaste(e.target.value)} className="mt-2 min-h-24" />
          <Button size="sm" className="mt-2" disabled={!paste.trim()} onClick={addPasted}>
            Add these words
          </Button>
        </details>
      </div>
      {picking && (
        <ImagePicker
          word={rows.find((r) => r.key === picking)?.en ?? ''}
          onClose={() => setPicking(null)}
          onPick={(img) => {
            change(picking, { img })
            setPicking(null)
          }}
        />
      )}
    </Dialog>
  )
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, BookOpen, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { Button, EmptyState, IconButton, Switch, Tabs, useFeedback } from '@/components/ui'
import { db } from '@/data/db'
import { remove, save } from '@/data/repo'
import type { VocabSet } from '@/data/schema'
import { cn } from '@/lib/cn'
import { BUILT_IN_SETS, ELEMENTARY_GROUPS, groupCover, hasUnits, imageUrl, JHS_GROUPS } from './data'
import { CustomSetEditor } from './CustomSetEditor'

type Tab = 'elementary' | 'jhs' | 'mine'

export interface SetChoice {
  set: string
  previous: boolean
}

function Tile({ title, sub, cover, onClick }: { title: string; sub?: string; cover: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-3xl bg-surface p-3 text-center shadow-sm ring-1 ring-line transition-all hover:-translate-y-0.5 hover:shadow-pop hover:ring-accent-muted"
    >
      <span className="block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-canvas">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="size-full object-contain p-1" />
        ) : (
          <BookOpen className="m-auto h-full text-ink-faint" size={36} aria-hidden />
        )}
      </span>
      <span className="text-base leading-tight font-black text-ink">{title}</span>
      {sub && <span className="text-sm font-semibold text-accent">{sub}</span>}
    </button>
  )
}

/** Choose a vocabulary set: built-in textbooks and categories, JHS unit words, or your own sets. */
export function SetPicker({ onPick, initialGroup = null }: { onPick: (c: SetChoice) => void; initialGroup?: string | null }) {
  const { toast } = useFeedback()
  const [tab, setTab] = useState<Tab>(initialGroup?.endsWith('(JHS)') ? 'jhs' : 'elementary')
  const [group, setGroup] = useState<string | null>(initialGroup)
  const [previous, setPrevious] = useState(false)
  const [editing, setEditing] = useState<VocabSet | 'new' | null>(null)
  const custom = useLiveQuery(() => db.vocabSets.orderBy('name').toArray(), [])

  const groups = tab === 'jhs' ? JHS_GROUPS : ELEMENTARY_GROUPS

  const del = async (s: VocabSet) => {
    await remove('vocabSets', s.id)
    toast(`Deleted “${s.name}”`, { action: { label: 'Undo', onClick: () => void save('vocabSets', s) } })
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <Tabs<Tab>
        label="Word sets"
        value={tab}
        onChange={(t) => {
          setTab(t)
          setGroup(null)
        }}
        items={[
          { id: 'elementary', label: 'Elementary' },
          { id: 'jhs', label: 'JHS words' },
          { id: 'mine', label: 'My sets', count: custom?.length },
        ]}
      />

      {tab === 'mine' ? (
        <div className="space-y-4">
          <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
            New word set
          </Button>
          {custom && !custom.length ? (
            <EmptyState
              icon={BookOpen}
              title="No word sets yet"
              description="Make a set from this week's words, with pictures from the library or your own."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {custom?.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line">
                  <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-canvas">
                    {s.cards.find((c) => c.img) && (
                      <img src={imageUrl(s.cards.find((c) => c.img)!.img)} alt="" className="size-full object-contain" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{s.name}</span>
                    <span className="text-sm text-ink-soft">{s.cards.length} words</span>
                  </span>
                  <IconButton icon={Pencil} size="sm" label={`Edit ${s.name}`} onClick={() => setEditing(s)} />
                  <IconButton icon={Trash2} size="sm" label={`Delete ${s.name}`} onClick={() => void del(s)} />
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Play}
                    disabled={!s.cards.length}
                    onClick={() => onPick({ set: `custom:${s.id}`, previous: false })}
                  >
                    Play
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : group ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={ArrowLeft} onClick={() => setGroup(null)}>
              Back
            </Button>
            <h2 className="text-2xl font-black">{group}</h2>
            {hasUnits(group) && (
              <div className="ml-auto min-w-60 rounded-2xl bg-accent-soft/60 px-4 py-2">
                <Switch
                  label="With previous units"
                  description="Mix in the words from earlier units"
                  checked={previous}
                  onChange={setPrevious}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BUILT_IN_SETS.filter((s) => s.group === group).map((s) => (
              <Tile
                key={s.id}
                title={s.title}
                sub={`${s.count} words`}
                cover={s.cover ? imageUrl(s.cover) : ''}
                onClick={() => onPick({ set: s.id, previous })}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={cn('grid gap-3', tab === 'jhs' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5')}>
          {groups.map((g) => (
            <Tile
              key={g}
              title={g}
              sub={`${BUILT_IN_SETS.filter((s) => s.group === g).length} sets`}
              cover={groupCover(g)}
              onClick={() => {
                setGroup(g)
                setPrevious(false)
              }}
            />
          ))}
        </div>
      )}
      {editing && <CustomSetEditor set={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

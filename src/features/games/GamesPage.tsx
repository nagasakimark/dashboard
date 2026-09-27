import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Expand, GraduationCap, Languages, Presentation, Shrink } from 'lucide-react'
import { ButtonLink, Spinner } from '@/components/ui'
import { db } from '@/data/db'
import { cn } from '@/lib/cn'
import { customDeck, loadDeck, preloadImages, type Deck } from './data'
import { MODES, modeAvailable } from './modes'
import { SetPicker } from './SetPicker'

function useDeck(setId: string | null, previous: boolean) {
  const customId = setId?.startsWith('custom:') ? setId.slice(7) : null
  const custom = useLiveQuery(() => (customId ? db.vocabSets.get(customId) : undefined), [customId])
  const [loaded, setLoaded] = useState<{ key: string; deck: Deck | null; error?: string } | null>(null)
  const key = `${setId}:${previous}`

  useEffect(() => {
    if (!setId || customId) return
    let off = false
    loadDeck(setId, previous)
      .then((deck) => {
        if (off) return
        preloadImages(deck.cards)
        setLoaded({ key, deck })
      })
      .catch((e: unknown) => !off && setLoaded({ key, deck: null, error: e instanceof Error ? e.message : 'Couldn’t load that set.' }))
    return () => {
      off = true
    }
  }, [setId, previous, customId, key])

  if (customId) return custom ? { deck: customDeck(custom) } : { deck: null, loading: custom === undefined }
  if (!setId) return { deck: null }
  return loaded?.key === key ? loaded : { deck: null, loading: true }
}

/** Vocabulary games: choose a set, choose a game, play full screen. */
export default function GamesPage() {
  const [params, setParams] = useSearchParams()
  const setId = params.get('set')
  const previous = params.get('prev') === '1'
  const modeId = params.get('mode')
  const [showJa, setShowJa] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const result = useDeck(setId, previous)
  const deck = result.deck
  const mode = MODES.find((m) => m.id === modeId)

  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const go = (next: { set?: string | null; prev?: boolean; mode?: string | null }) =>
    setParams((p) => {
      if (next.set !== undefined) {
        if (next.set) p.set('set', next.set)
        else p.delete('set')
        p.delete('mode')
      }
      if (next.prev !== undefined) {
        if (next.prev) p.set('prev', '1')
        else p.delete('prev')
      }
      if (next.mode !== undefined) {
        if (next.mode) p.set('mode', next.mode)
        else p.delete('mode')
      }
      return p
    })

  const playing = mode && deck && modeAvailable(mode, deck.cards) ? { mode, deck, Game: mode.component } : null
  const bar = 'inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors hover:bg-ink/6'

  return (
    <div className="fixed inset-0 flex flex-col bg-[linear-gradient(160deg,#eef2ff_0%,#f8fafc_45%,#ecfeff_100%)]">
      <header className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line/70 bg-surface/80 px-2 py-1.5 backdrop-blur sm:px-3">
        {setId ? (
          <button type="button" className={bar} onClick={() => (mode ? go({ mode: null }) : go({ set: null, prev: false }))}>
            <ArrowLeft size={18} aria-hidden /> {mode ? 'Games' : 'Word sets'}
          </button>
        ) : (
          <ButtonLink to="/board" variant="ghost" icon={Presentation} size="sm">
            Board
          </ButtonLink>
        )}
        <h1 className="min-w-0 flex-1 truncate px-2 text-lg font-black">
          {deck ? (
            <>
              {deck.title} <span className="font-semibold text-ink-faint">· {deck.cards.length} words</span>
            </>
          ) : (
            'Games'
          )}
        </h1>
        {playing && (
          <select
            aria-label="Game"
            value={playing.mode.id}
            onChange={(e) => go({ mode: e.target.value })}
            className="h-10 rounded-xl border border-line bg-surface px-2 text-sm font-bold"
          >
            {MODES.filter((m) => modeAvailable(m, playing.deck.cards)).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
        {setId && (
          <button
            type="button"
            className={cn(bar, showJa && 'bg-accent-soft text-accent-strong')}
            aria-pressed={showJa}
            onClick={() => setShowJa((v) => !v)}
            title="Show Japanese"
          >
            <Languages size={18} aria-hidden /> <span className="hidden sm:inline">日本語</span>
          </button>
        )}
        {!setId && (
          <ButtonLink to="/jhs" variant="subtle" icon={GraduationCap} size="sm" aria-label="JHS Classroom Mode">
            <span className="hidden sm:inline">JHS Classroom Mode</span>
            <span className="sm:hidden">JHS</span>
          </ButtonLink>
        )}
        <button
          type="button"
          className={bar}
          aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
          onClick={() =>
            document.fullscreenElement
              ? void document.exitFullscreen()
              : void document.documentElement.requestFullscreen?.().catch(() => {})
          }
        >
          {fullscreen ? <Shrink size={18} aria-hidden /> : <Expand size={18} aria-hidden />}
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {!setId ? (
          <SetPicker onPick={(c) => go({ set: c.set, prev: c.previous })} />
        ) : !deck ? (
          <div className="grid h-full place-items-center text-center">
            {'error' in result && result.error ? <p className="text-danger">{result.error}</p> : <Spinner />}
          </div>
        ) : playing ? (
          <Suspense
            fallback={
              <div className="grid h-full place-items-center">
                <Spinner />
              </div>
            }
          >
            <playing.Game key={`${playing.deck.id}-${playing.mode.id}`} cards={playing.deck.cards} showJa={showJa} />
          </Suspense>
        ) : (
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-6">
            {MODES.map((m) => {
              const ok = modeAvailable(m, deck.cards)
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={!ok}
                  onClick={() => go({ mode: m.id })}
                  className="flex flex-col items-center gap-2 rounded-3xl bg-surface p-5 text-center shadow-sm ring-1 ring-line transition-all hover:-translate-y-0.5 hover:shadow-pop hover:ring-accent-muted disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
                    <m.icon size={28} aria-hidden />
                  </span>
                  <span className="text-lg font-black">{m.name}</span>
                  <span className="text-sm text-ink-soft">{ok ? m.description : 'Needs words with pictures'}</span>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { PartyPopper, Play, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Card } from '../data'
import { memoryCards, shuffle } from '../engine'
import { FitText } from '../FitText'
import { BigButton, CardImage, NotEnough } from '../ui'
import { CardPicker } from './CardPicker'

type Tile = ReturnType<typeof memoryCards>[number]

/** Match each picture with its word (or each word with its Japanese). */
export default function Memory({ cards }: { cards: Card[] }) {
  const max = Math.min(cards.length, 12)
  const [setup, setSetup] = useState(true)
  const [mode, setMode] = useState<'random' | 'choose'>('random')
  const [pairs, setPairs] = useState(Math.min(6, max))
  const [chosen, setChosen] = useState<number[]>(() => [...Array(Math.min(6, max)).keys()])
  const [tiles, setTiles] = useState<Tile[]>([])
  const [open, setOpen] = useState<string[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  if (cards.length < 2) return <NotEnough need={2} />

  const start = () => {
    const picked = mode === 'choose' ? chosen.map((i) => cards[i]) : shuffle(cards).slice(0, pairs)
    setTiles(memoryCards(picked))
    setOpen([])
    setMatched(new Set())
    setMoves(0)
    setSetup(false)
  }
  const flip = (t: Tile) => {
    if (open.length >= 2 || open.includes(t.id) || matched.has(t.pair)) return
    const next = [...open, t.id]
    setOpen(next)
    if (next.length < 2) return
    setMoves((m) => m + 1)
    const [a, b] = next.map((id) => tiles.find((x) => x.id === id)!)
    if (a.pair === b.pair) {
      setMatched(new Set([...matched, a.pair]))
      setOpen([])
    } else timer.current = setTimeout(() => setOpen([]), 1100)
  }
  const won = !setup && matched.size === tiles.length / 2
  const cols = tiles.length <= 8 ? 4 : tiles.length <= 12 ? 4 : tiles.length <= 18 ? 6 : 6

  if (setup)
    return (
      <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm ring-1 ring-line">
          <div role="radiogroup" aria-label="Pairs" className="flex rounded-xl bg-ink/5 p-1">
            {(['random', 'choose'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-base font-bold',
                  mode === m ? 'bg-surface text-accent-strong shadow-sm' : 'text-ink-soft',
                )}
              >
                {m === 'random' ? 'Random' : 'Choose cards'}
              </button>
            ))}
          </div>
          {mode === 'random' && (
            <label className="flex items-center gap-2 text-lg font-bold">
              Pairs
              <input
                type="range"
                min={2}
                max={max}
                value={pairs}
                onChange={(e) => setPairs(+e.target.value)}
                className="w-36 accent-accent"
              />
              <span className="w-8 text-2xl text-accent">{pairs}</span>
            </label>
          )}
          <span className="flex-1" />
          <BigButton tone="primary" onClick={start} disabled={mode === 'choose' && chosen.length < 2}>
            <Play size={22} aria-hidden /> Start game
          </BigButton>
        </div>
        {mode === 'choose' && <CardPicker cards={cards} selected={chosen} max={max} onChange={setChosen} />}
      </div>
    )

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-xl bg-surface px-4 py-2 text-xl font-bold shadow-sm ring-1 ring-line tabular-nums">
          Moves: {moves} · Pairs: {matched.size}/{tiles.length / 2}
        </span>
        <BigButton onClick={() => setSetup(true)}>Change pairs</BigButton>
      </div>
      {won ? (
        <div className="grid flex-1 place-items-center">
          <div className="animate-pop-in text-center">
            <PartyPopper size={64} className="mx-auto text-amber-500" aria-hidden />
            <h2 className="mt-3 text-5xl font-black">All matched!</h2>
            <p className="mt-2 text-2xl text-ink-soft">{moves} moves</p>
            <BigButton tone="primary" className="mt-6" onClick={start}>
              <RotateCcw size={22} aria-hidden /> Play again
            </BigButton>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {tiles.map((t) => {
            const up = open.includes(t.id) || matched.has(t.pair)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => flip(t)}
                aria-label={up ? (t.face === 'japanese' ? t.card.ja : t.card.en) : 'Hidden card'}
                className="min-h-0 [perspective:900px]"
              >
                <span
                  className={cn(
                    'relative block size-full transition-transform duration-300 [transform-style:preserve-3d]',
                    up && '[transform:rotateY(180deg)]',
                  )}
                >
                  <span className="absolute inset-0 grid place-items-center rounded-2xl bg-[linear-gradient(145deg,#818cf8,#4f46e5)] text-4xl font-black text-white/70 shadow-md [backface-visibility:hidden]">
                    ?
                  </span>
                  <span
                    className={cn(
                      'absolute inset-0 grid place-items-center overflow-hidden rounded-2xl bg-white p-2 shadow-md ring-2 [backface-visibility:hidden] [transform:rotateY(180deg)]',
                      matched.has(t.pair) ? 'ring-success' : 'ring-line',
                    )}
                  >
                    {t.face === 'image' ? (
                      <CardImage card={t.card} />
                    ) : (
                      <FitText
                        text={t.face === 'japanese' ? t.card.ja || t.card.en : t.card.en}
                        lang={t.face === 'japanese' ? 'ja' : undefined}
                        max={32}
                        min={10}
                        lines={3}
                        className="px-1 font-black"
                      />
                    )}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { EyeOff, Play, RotateCcw, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Card } from '../data'
import { shuffle } from '../engine'
import { FitText } from '../FitText'
import { BigButton, CardImage, NotEnough } from '../ui'
import { CardPicker } from './CardPicker'

type Phase = 'setup' | 'hidden' | 'reveal'

/** Remember the cards, close your eyes, then say which ones disappeared. */
export default function Missing({ cards }: { cards: Card[] }) {
  const max = Math.min(cards.length, 12)
  const [mode, setMode] = useState<'random' | 'choose'>('random')
  const [count, setCount] = useState(Math.min(6, max))
  const [chosen, setChosen] = useState<number[]>(() => [...Array(Math.min(6, max)).keys()])
  const [hide, setHide] = useState(Math.min(2, Math.max(1, Math.floor(Math.min(6, max) / 3))))
  const [phase, setPhase] = useState<Phase>('setup')
  const [round, setRound] = useState<Card[]>(() => shuffle(cards).slice(0, Math.min(6, max)))
  const [missing, setMissing] = useState<Set<number>>(new Set())

  if (cards.length < 3) return <NotEnough need={3} />

  const onScreen = mode === 'choose' ? chosen.map((i) => cards[i]) : round
  const maxHide = Math.max(1, Math.floor(onScreen.length / 2))
  const hideN = Math.min(hide, maxHide)
  const cols = onScreen.length <= 4 ? 2 : onScreen.length <= 9 ? 3 : 4

  const start = () => {
    setMissing(new Set(shuffle([...onScreen.keys()]).slice(0, hideN)))
    setPhase('hidden')
  }
  const again = () => {
    if (mode === 'random') setRound(shuffle(cards).slice(0, count))
    setMissing(new Set())
    setPhase('setup')
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm ring-1 ring-line">
        {phase === 'setup' ? (
          <>
            <div role="radiogroup" aria-label="Cards" className="flex rounded-xl bg-ink/5 p-1">
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
                Cards
                <input
                  type="range"
                  min={3}
                  max={max}
                  value={count}
                  onChange={(e) => {
                    setCount(+e.target.value)
                    setRound(shuffle(cards).slice(0, +e.target.value))
                  }}
                  className="w-36 accent-accent"
                />
                <span className="w-8 text-2xl text-accent">{count}</span>
              </label>
            )}
            <label className="flex items-center gap-2 text-lg font-bold">
              Hide
              <input
                type="range"
                min={1}
                max={maxHide}
                value={hideN}
                onChange={(e) => setHide(+e.target.value)}
                className="w-28 accent-accent"
              />
              <span className="w-8 text-2xl text-accent">{hideN}</span>
            </label>
            <span className="flex-1" />
            <BigButton tone="primary" onClick={start} disabled={onScreen.length < 2}>
              <EyeOff size={22} aria-hidden /> Hide cards
            </BigButton>
          </>
        ) : (
          <>
            <span className="text-xl font-bold text-ink-soft">
              {phase === 'hidden'
                ? `${hideN} ${hideN === 1 ? 'card is' : 'cards are'} missing. Can you remember?`
                : 'Yellow cards were the missing ones.'}
            </span>
            <span className="flex-1" />
            {phase === 'hidden' ? (
              <BigButton tone="primary" onClick={() => setPhase('reveal')}>
                <Search size={22} aria-hidden /> Show answer
              </BigButton>
            ) : (
              <BigButton tone="primary" onClick={again}>
                <RotateCcw size={22} aria-hidden /> Play again
              </BigButton>
            )}
          </>
        )}
      </div>
      {phase === 'setup' && mode === 'choose' ? (
        <CardPicker cards={cards} selected={chosen} max={max} onChange={setChosen} />
      ) : (
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {onScreen.map((c, i) => {
            const gone = missing.has(i)
            return (
              <div
                key={`${c.en}-${i}`}
                className={cn(
                  'flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-md ring-2 transition-all',
                  phase === 'reveal' && gone ? 'animate-pop-in ring-8 ring-amber-400' : 'ring-line',
                  phase === 'hidden' && gone && 'invisible',
                )}
              >
                <div className="min-h-0 flex-1 p-2">
                  <CardImage card={c} />
                </div>
                <FitText text={c.en} max={28} min={10} lines={1} className="px-2 pb-2 font-black" />
              </div>
            )
          })}
        </div>
      )}
      {phase === 'setup' && mode === 'random' && (
        <p className="text-center text-sm text-ink-faint">
          <Play size={14} className="inline" aria-hidden /> Let the class look, then press “Hide cards”.
        </p>
      )}
    </div>
  )
}

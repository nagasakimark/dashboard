import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Card } from '../data'
import { shuffle } from '../engine'
import { FitText } from '../FitText'
import { BigButton, CardImage, Japanese } from '../ui'

const FLIP_MS = 460

/** Flip through the set: picture on the front, word and Japanese on the back. */
export default function Flashcards({ cards, showJa }: { cards: Card[]; showJa: boolean }) {
  const [order, setOrder] = useState(cards)
  const [shuffled, setShuffled] = useState(false)
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  // Moving on from a flipped card: turn it back first, then change the card,
  // so the next word is never visible during the flip.
  const [turning, setTurning] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const card = order[i]

  const go = (d: number) => {
    const next = () => setI((x) => (x + d + order.length) % order.length)
    window.clearTimeout(timer.current)
    if (flipped || turning) {
      setFlipped(false)
      setTurning(true)
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      timer.current = window.setTimeout(
        () => {
          next()
          setTurning(false)
        },
        reduced ? 0 : FLIP_MS,
      )
    } else next()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === ' ' || e.key === 'Enter') setFlipped((f) => !f)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!card) return null
  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex min-h-0 flex-1 items-center gap-3 sm:gap-5">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous card"
          className="grid size-16 shrink-0 place-items-center rounded-full bg-surface shadow-sm ring-1 ring-line hover:ring-accent-muted sm:size-24"
        >
          <ChevronLeft size={40} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? `${card.en}. Show the picture` : 'Flip the card'}
          className="h-full min-w-0 flex-1 [perspective:1400px]"
        >
          <span
            className={cn(
              'relative block size-full transition-transform duration-[450ms] ease-out [transform-style:preserve-3d] motion-reduce:transition-none',
              flipped && '[transform:rotateY(180deg)]',
            )}
          >
            <span className="absolute inset-0 overflow-hidden rounded-[2rem] bg-white p-4 shadow-pop ring-1 ring-line [backface-visibility:hidden]">
              <CardImage card={card} />
            </span>
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-6 rounded-[2rem] bg-[linear-gradient(145deg,#eef2ff,#c7d2fe)] px-[6%] shadow-pop [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <FitText text={card.en} max={104} min={20} className="font-black tracking-tight text-ink" />
              {showJa && <Japanese card={card} className="text-[clamp(1.5rem,4vw,3rem)]" />}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next card"
          className="grid size-16 shrink-0 place-items-center rounded-full bg-surface shadow-sm ring-1 ring-line hover:ring-accent-muted sm:size-24"
        >
          <ChevronRight size={40} aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="px-3 font-mono text-2xl font-bold text-ink-soft tabular-nums">
          {i + 1} / {order.length}
        </span>
        <BigButton
          tone={shuffled ? 'primary' : 'plain'}
          aria-pressed={shuffled}
          onClick={() => {
            setOrder(shuffled ? cards : shuffle(cards))
            setShuffled(!shuffled)
            setI(0)
            setFlipped(false)
          }}
        >
          <Shuffle size={22} aria-hidden /> Shuffle
        </BigButton>
        <BigButton
          onClick={() => {
            setI(0)
            setFlipped(false)
          }}
        >
          <RotateCcw size={22} aria-hidden /> Restart
        </BigButton>
      </div>
    </div>
  )
}

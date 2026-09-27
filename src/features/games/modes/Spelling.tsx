import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Lightbulb, Volume2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Card } from '../data'
import { isTypeable, shuffle, speak } from '../engine'
import { BigButton, CardImage, Japanese } from '../ui'

/** Spell the word: letters appear as the class calls them out (or type them). */
export default function Spelling({ cards, showJa }: { cards: Card[]; showJa: boolean }) {
  const order = useMemo(() => shuffle(cards), [cards])
  const [i, setI] = useState(0)
  const [found, setFound] = useState(0)
  const [all, setAll] = useState(false)
  const card = order[i]
  const word = card?.en ?? ''
  const slots = useMemo(
    () =>
      word
        .split('')
        .map((ch, k) => ({ ch, k }))
        .filter((s) => isTypeable(s.ch)),
    [word],
  )
  const done = all || found >= slots.length

  const go = (d: number) => {
    setI((x) => (x + d + order.length) % order.length)
    setFound(0)
    setAll(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Backspace') setFound((f) => Math.max(0, f - 1))
      else if (!done && e.key.length === 1 && slots[found]?.ch.toUpperCase() === e.key.toUpperCase()) setFound(found + 1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!card) return null
  const shownUpTo = all ? Infinity : (slots[found - 1]?.k ?? -1)

  return (
    <div className="flex h-full flex-col items-center gap-4 p-4 sm:p-6">
      <div className="flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center gap-4">
        <div className="min-h-0 w-full max-w-2xl flex-1 overflow-hidden rounded-3xl bg-white p-3 shadow-md ring-1 ring-line">
          <CardImage card={card} />
        </div>
        {showJa && <Japanese card={card} className="text-2xl" />}
        <p className="text-lg font-semibold text-ink-soft">Spell the word</p>
        <div className="flex flex-wrap justify-center gap-2" aria-live="polite" aria-label="Word">
          {word.split('').map((ch, k) =>
            isTypeable(ch) ? (
              <span
                key={k}
                className={cn(
                  'grid h-16 w-12 place-items-center rounded-xl border-b-4 text-4xl font-black sm:h-20 sm:w-16 sm:text-5xl',
                  k <= shownUpTo ? (done ? 'border-success text-success' : 'border-accent text-ink') : 'border-ink/20 text-transparent',
                )}
              >
                {k <= shownUpTo ? ch.toUpperCase() : '_'}
              </span>
            ) : (
              <span key={k} className="grid h-16 w-4 place-items-end text-4xl font-black sm:h-20">
                {ch === ' ' ? '' : ch}
              </span>
            ),
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <BigButton onClick={() => go(-1)} aria-label="Previous word">
          <ChevronLeft size={24} aria-hidden />
        </BigButton>
        <BigButton onClick={() => speak(word)} aria-label="Say the word">
          <Volume2 size={22} aria-hidden />
        </BigButton>
        <BigButton tone="primary" onClick={() => setFound((f) => Math.min(slots.length, f + 1))} disabled={done}>
          <Lightbulb size={22} aria-hidden /> Next letter
        </BigButton>
        <BigButton onClick={() => setAll(true)} disabled={done}>
          <Eye size={22} aria-hidden /> Show word
        </BigButton>
        <BigButton onClick={() => go(1)} aria-label="Next word" tone={done ? 'primary' : 'plain'}>
          <ChevronRight size={24} aria-hidden />
        </BigButton>
      </div>
    </div>
  )
}

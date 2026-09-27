import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Sparkles } from 'lucide-react'
import { withImages, type Card } from '../data'
import { shuffle } from '../engine'
import { FitText } from '../FitText'
import { BigButton, CardImage, Japanese, NotEnough } from '../ui'

const COLS = 5
const ROWS = 4
const TILES = COLS * ROWS

/** Uncover a hidden picture tile by tile until someone guesses the word. */
export default function PictureReveal({ cards, showJa }: { cards: Card[]; showJa: boolean }) {
  const pool = useMemo(() => shuffle(withImages(cards)), [cards])
  const [i, setI] = useState(0)
  const [order, setOrder] = useState(() => shuffle([...Array(TILES).keys()]))
  const [shown, setShown] = useState<Set<number>>(new Set())
  const [answer, setAnswer] = useState(false)
  const card = pool[i]

  if (!card) return <NotEnough need={1} what="picture" />

  const go = (d: number) => {
    setI((x) => (x + d + pool.length) % pool.length)
    setOrder(shuffle([...Array(TILES).keys()]))
    setShown(new Set())
    setAnswer(false)
  }
  const revealOne = () => {
    const next = order.find((t) => !shown.has(t))
    if (next !== undefined) setShown(new Set([...shown, next]))
  }
  const hiddenPct = Math.round((1 - shown.size / TILES) * 100)

  return (
    <div className="flex h-full flex-col items-center gap-4 p-4 sm:p-6">
      <div className="relative min-h-0 w-full max-w-5xl flex-1 overflow-hidden rounded-[2rem] bg-white shadow-pop ring-1 ring-line">
        <div className="absolute inset-0 p-4">
          <CardImage card={card} alt={answer ? card.en : 'Hidden picture'} />
        </div>
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
        >
          {Array.from({ length: TILES }, (_, t) => (
            <button
              key={`${i}-${t}`}
              type="button"
              aria-label={`Reveal tile ${t + 1}`}
              disabled={shown.has(t) || answer}
              onClick={() => setShown(new Set([...shown, t]))}
              className="border border-white/50 bg-[linear-gradient(145deg,#e0e7ff,#cbd5e1)] transition-opacity duration-300 disabled:pointer-events-none"
              style={{ opacity: shown.has(t) || answer ? 0 : 1 }}
            />
          ))}
        </div>
      </div>
      <div className="flex min-h-16 flex-col items-center" aria-live="polite">
        {answer ? (
          <>
            <FitText text={card.en} max={64} min={18} className="max-w-3xl font-black" />
            {showJa && <Japanese card={card} className="mt-1 text-2xl" />}
          </>
        ) : (
          <span className="text-xl font-semibold text-ink-soft">{hiddenPct}% hidden — what is it?</span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <BigButton onClick={() => go(-1)} aria-label="Previous picture">
          <ChevronLeft size={24} aria-hidden />
        </BigButton>
        <BigButton tone="primary" onClick={revealOne} disabled={answer || shown.size >= TILES}>
          <Sparkles size={22} aria-hidden /> Reveal a tile
        </BigButton>
        <BigButton onClick={() => setAnswer(true)} disabled={answer}>
          <Eye size={22} aria-hidden /> Show answer
        </BigButton>
        <BigButton onClick={() => go(1)} aria-label="Next picture">
          <ChevronRight size={24} aria-hidden />
        </BigButton>
      </div>
    </div>
  )
}

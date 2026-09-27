import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { withImages, type Card } from '../data'
import { shuffle, useScore, withDistractors } from '../engine'
import { BigButton, CardImage, Japanese, NotEnough, ScoreBar } from '../ui'

/** Four-choice quiz: which word matches the picture? */
export default function Quiz({ cards, showJa }: { cards: Card[]; showJa: boolean }) {
  const pool = useMemo(() => withImages(cards), [cards])
  const [order, setOrder] = useState(() => shuffle(pool))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const score = useScore('quiz')
  const card = order[i % Math.max(1, order.length)]
  const options = useMemo(() => (card ? withDistractors(card, cards) : []), [card, cards])

  if (pool.length < 1 || new Set(cards.map((c) => c.en.toLowerCase())).size < 4) return <NotEnough need={4} what="words with pictures" />

  const choose = (en: string) => {
    if (picked) return
    setPicked(en)
    score.record(en === card.en)
  }
  const next = () => {
    if (i + 1 >= order.length) {
      setOrder(shuffle(pool))
      setI(0)
    } else setI(i + 1)
    setPicked(null)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <ScoreBar {...score} />
      <div className="min-h-0 flex-1 overflow-hidden rounded-3xl bg-white p-4 shadow-pop ring-1 ring-line">
        <CardImage card={card} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const right = picked && o.en === card.en
          const wrong = picked === o.en && o.en !== card.en
          return (
            <button
              key={o.en}
              type="button"
              onClick={() => choose(o.en)}
              className={cn(
                'rounded-2xl px-4 py-4 text-[clamp(1.25rem,3vw,2.25rem)] leading-tight font-black ring-2 transition-all',
                right
                  ? 'scale-[1.03] bg-success text-white ring-success'
                  : wrong
                    ? 'bg-danger text-white ring-danger'
                    : picked
                      ? 'bg-surface text-ink-faint opacity-60 ring-line'
                      : 'bg-surface text-ink ring-line hover:ring-accent',
              )}
            >
              {o.en}
            </button>
          )
        })}
      </div>
      <div className="flex min-h-14 items-center justify-center gap-4">
        {picked && (
          <>
            {showJa && <Japanese card={card} className="text-2xl" />}
            <BigButton tone="primary" onClick={next} autoFocus>
              Next <ArrowRight size={22} aria-hidden />
            </BigButton>
          </>
        )}
      </div>
    </div>
  )
}

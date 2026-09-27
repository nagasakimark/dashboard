import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { uniqueCards, withImages, type Card } from '../data'
import { shuffle, speak, useScore, withDistractors } from '../engine'
import { FitText } from '../FitText'
import { BigButton, CardImage, Japanese, NotEnough, ScoreBar } from '../ui'

const CORNERS = ['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3']
const TINTS = ['bg-[#88aca5]', 'bg-[#f7b267]', 'bg-[#7ebc59]', 'bg-[#6a9eda]']

function round(pool: Card[]) {
  const answer = shuffle(pool)[0]
  return { answer, options: withDistractors(answer, pool) }
}

/** Hear (and see) a word, then tap the matching picture in one of the four corners. */
export default function CornerPop({ cards, showJa }: { cards: Card[]; showJa: boolean }) {
  const pool = useMemo(() => uniqueCards(withImages(cards)), [cards])
  const enough = new Set(pool.map((c) => c.en.toLowerCase())).size >= 4
  const [state, setState] = useState(() => (enough ? round(pool) : null))
  const [picked, setPicked] = useState<{ en: string; ok: boolean } | null>(null)
  const [voice, setVoice] = useState(true)
  const score = useScore('cornerpop')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const next = useCallback(() => {
    setPicked(null)
    setState(round(pool))
  }, [pool])

  useEffect(() => {
    if (voice && state) speak(state.answer.en)
  }, [voice, state])
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      window.speechSynthesis?.cancel()
    },
    [],
  )

  if (!enough || !state) return <NotEnough need={4} what="words with pictures" />

  const choose = (c: Card) => {
    if (picked?.ok) return
    const ok = c.en === state.answer.en
    setPicked({ en: c.en, ok })
    score.record(ok)
    if (ok) timer.current = setTimeout(next, 900)
  }

  return (
    <div className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_top,#fff7ed,#fffbeb_32%,#eff6ff_100%)]">
      {state.options.map((c, i) => (
        <button
          key={`${state.answer.en}-${c.en}`}
          type="button"
          onClick={() => choose(c)}
          aria-label={`Picture ${i + 1}`}
          className={cn(
            'absolute aspect-[4/3] w-[30%] max-w-[300px] animate-pop-in overflow-hidden rounded-3xl p-2 shadow-pop transition-transform hover:scale-105',
            CORNERS[i],
            TINTS[i],
            picked?.en === c.en && (picked.ok ? 'scale-110 ring-8 ring-success' : 'animate-wiggle opacity-50'),
          )}
        >
          <span className="block size-full overflow-hidden rounded-2xl bg-white">
            <CardImage card={c} />
          </span>
        </button>
      ))}
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 px-[34%] text-center">
        <FitText text={state.answer.en} max={80} min={18} className="font-black tracking-tight text-ink" />
        {showJa && <Japanese card={state.answer} className="text-2xl" />}
        <div className="min-h-10 text-3xl font-black" aria-live="polite">
          {picked &&
            (picked.ok ? (
              <span className="text-success">{score.streak >= 3 ? 'Awesome!' : 'Nice!'}</span>
            ) : (
              <span className="text-danger">Try again!</span>
            ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <BigButton onClick={() => speak(state.answer.en)} aria-label="Say the word again" className="h-12 px-4">
            <Volume2 size={22} aria-hidden />
          </BigButton>
          <BigButton onClick={() => setVoice((v) => !v)} aria-pressed={voice} className="h-12 px-4 text-base">
            Voice {voice ? 'on' : 'off'}
          </BigButton>
          <BigButton onClick={next} className="h-12 px-4 text-base">
            Skip
          </BigButton>
        </div>
        <ScoreBar {...score} />
      </div>
    </div>
  )
}

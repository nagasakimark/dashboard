import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Delete, Eye } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Card } from '../data'
import { isTypeable, scramble, shuffle, useScore } from '../engine'
import { BigButton, CardImage, Japanese, ScoreBar } from '../ui'

/** Put the scrambled letters back in order (click, or type them). */
export default function Scramble({ cards, showJa }: { cards: Card[]; showJa: boolean }) {
  const order = useMemo(() => shuffle(cards), [cards])
  const [i, setI] = useState(0)
  const card = order[i]
  const word = card?.en ?? ''
  const letters = useMemo(() => scramble(word.replace(/[^a-z0-9]/gi, '')), [word])
  const [answer, setAnswer] = useState<{ char: string; id: number }[]>([])
  const [revealed, setRevealed] = useState(false)
  const score = useScore('scramble')
  const target = word.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const built = answer.map((a) => a.char).join('')
  const solved = built === target
  const left = letters.filter((l) => !answer.some((a) => a.id === l.id))

  const [scored, setScored] = useState<number | null>(null)
  if (solved && scored !== i && !revealed) {
    setScored(i)
    score.record(true)
  }

  const go = (d: number) => {
    setI((x) => (x + d + order.length) % order.length)
    setAnswer([])
    setRevealed(false)
  }
  const add = (l: { char: string; id: number }) => !solved && setAnswer((a) => [...a, l])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'Backspace') setAnswer((a) => a.slice(0, -1))
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (isTypeable(e.key) && e.key.length === 1) {
        const l = left.find((x) => x.char === e.key.toUpperCase())
        if (l) add(l)
        else return
      } else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!card) return null
  // Show the word with its spaces/punctuation, filling letters as they're placed.
  let n = 0
  const display = word.split('').map((ch) => (isTypeable(ch) ? (revealed ? ch.toUpperCase() : (answer[n++]?.char ?? '')) : ch))

  return (
    <div className="flex h-full flex-col items-center gap-4 p-4 sm:p-6">
      <ScoreBar {...score} />
      <div className="flex min-h-0 w-full max-w-5xl flex-1 gap-4">
        <div className="hidden w-1/3 overflow-hidden rounded-3xl bg-white p-3 shadow-md ring-1 ring-line sm:block">
          <CardImage card={card} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-6">
          <div className="flex flex-wrap justify-center gap-2" aria-label="Your answer" aria-live="polite">
            {display.map((ch, k) =>
              isTypeable(word[k]) ? (
                <span
                  key={k}
                  className={cn(
                    'grid h-16 w-12 place-items-center rounded-xl border-b-4 text-4xl font-black sm:h-20 sm:w-16 sm:text-5xl',
                    solved
                      ? 'border-success bg-success/10 text-success'
                      : revealed
                        ? 'border-amber-400 text-amber-600'
                        : 'border-accent bg-accent-soft/60',
                  )}
                >
                  {ch}
                </span>
              ) : (
                <span key={k} className="grid h-16 w-4 place-items-end text-4xl font-black sm:h-20">
                  {ch === ' ' ? '' : ch}
                </span>
              ),
            )}
          </div>
          <div className="min-h-10 text-center text-3xl font-black text-success">{solved && 'Correct! 🎉'}</div>
          <div className="flex flex-wrap justify-center gap-2" aria-label="Letters">
            {letters.map((l) => {
              const used = answer.some((a) => a.id === l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={used || solved}
                  onClick={() => add(l)}
                  className="grid h-16 w-14 place-items-center rounded-2xl bg-white text-4xl font-black shadow-md ring-1 ring-line transition-all hover:-translate-y-0.5 disabled:opacity-20 sm:h-20 sm:w-16"
                >
                  {l.char}
                </button>
              )
            })}
          </div>
          {showJa && <Japanese card={card} className="text-2xl" />}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <BigButton onClick={() => go(-1)} aria-label="Previous word">
          <ChevronLeft size={24} aria-hidden />
        </BigButton>
        <BigButton onClick={() => setAnswer((a) => a.slice(0, -1))} disabled={!answer.length || solved}>
          <Delete size={22} aria-hidden /> Undo letter
        </BigButton>
        <BigButton onClick={() => setRevealed(true)} disabled={solved || revealed}>
          <Eye size={22} aria-hidden /> Show word
        </BigButton>
        <BigButton tone={solved || revealed ? 'primary' : 'plain'} onClick={() => go(1)} aria-label="Next word">
          <ChevronRight size={24} aria-hidden />
        </BigButton>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Eye, Languages, Lightbulb, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { shuffle } from '@/features/games/engine'
import { BigButton } from '@/features/games/ui'
import { clozeAnswers, reorderTiles, sameAnswer, stripCitations, type Exercise, type ExerciseSet } from './data'
import { Bold, GrammarCard } from './parts'

type Result = 'right' | 'wrong' | null

function Reorder({ ex, reveal, onResult }: { ex: Extract<Exercise, { type: 'reorder' }>; reveal: boolean; onResult: (r: Result) => void }) {
  const tiles = useMemo(() => shuffle(reorderTiles(ex.question).map((text, id) => ({ text, id }))), [ex])
  const [built, setBuilt] = useState<number[]>([])
  const sentence = built.map((i) => tiles.find((t) => t.id === i)!.text).join(' ')
  return (
    <div className="space-y-6">
      <div
        className="flex min-h-20 flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-accent-muted bg-white/70 p-3"
        aria-label="Your sentence"
      >
        {reveal ? (
          <span className="text-3xl font-bold text-amber-600">{ex.answer}</span>
        ) : built.length ? (
          built.map((i, k) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setBuilt(built.filter((x) => x !== i))
                onResult(null)
              }}
              className="rounded-2xl bg-accent px-4 py-2 text-3xl font-bold text-white shadow-md"
              aria-label={`Remove ${tiles.find((t) => t.id === i)!.text} (word ${k + 1})`}
            >
              {tiles.find((t) => t.id === i)!.text}
            </button>
          ))
        ) : (
          <span className="text-lg text-ink-faint">Tap the words in order</span>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2" aria-label="Words">
        {tiles.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={built.includes(t.id) || reveal}
            onClick={() => {
              setBuilt([...built, t.id])
              onResult(null)
            }}
            className="rounded-2xl bg-white px-4 py-2 text-3xl font-bold shadow-md ring-1 ring-line transition-all hover:-translate-y-0.5 disabled:opacity-25"
          >
            {t.text}
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-3">
        <BigButton onClick={() => setBuilt([])} disabled={!built.length || reveal}>
          <RotateCcw size={20} aria-hidden /> Clear
        </BigButton>
        <BigButton
          tone="primary"
          disabled={built.length !== tiles.length || reveal}
          onClick={() => onResult(sameAnswer(sentence, ex.answer) ? 'right' : 'wrong')}
        >
          <Check size={22} aria-hidden /> Check answer
        </BigButton>
      </div>
    </div>
  )
}

function Cloze({ ex, reveal, onResult }: { ex: Extract<Exercise, { type: 'cloze' }>; reveal: boolean; onResult: (r: Result) => void }) {
  const [value, setValue] = useState('')
  const [before, after] = ex.question.split(/_{2,}/)
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        onResult(clozeAnswers(ex.answer).some((a) => sameAnswer(a, value)) ? 'right' : 'wrong')
      }}
    >
      <p className="flex flex-wrap items-baseline justify-center gap-2 text-center text-[clamp(1.75rem,4vw,3rem)] leading-snug font-bold">
        <span>{before}</span>
        {reveal ? (
          <span className="rounded-xl bg-amber-100 px-3 text-amber-700">{ex.answer}</span>
        ) : (
          <input
            aria-label="Missing word"
            autoComplete="off"
            autoCapitalize="off"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              onResult(null)
            }}
            className="w-48 rounded-xl border-b-4 border-accent bg-accent-soft/50 px-3 text-center outline-none focus:bg-white"
          />
        )}
        <span>{after}</span>
      </p>
      <div className="flex justify-center">
        <BigButton type="submit" tone="primary" disabled={!value.trim() || reveal}>
          <Check size={22} aria-hidden /> Check answer
        </BigButton>
      </div>
    </form>
  )
}

function Choice({ ex, reveal, onResult }: { ex: Extract<Exercise, { type: 'choice' }>; reveal: boolean; onResult: (r: Result) => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <div className="space-y-6">
      <p className="text-center text-[clamp(1.75rem,4vw,3rem)] font-bold">{ex.question}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {ex.options.map((o) => {
          const show = reveal || picked !== null
          return (
            <button
              key={o}
              type="button"
              onClick={() => {
                setPicked(o)
                onResult(sameAnswer(o, ex.answer) ? 'right' : 'wrong')
              }}
              className={cn(
                'min-w-32 rounded-2xl px-6 py-3 text-3xl font-bold ring-2 transition-all',
                show && sameAnswer(o, ex.answer)
                  ? 'bg-success text-white ring-success'
                  : picked === o
                    ? 'bg-danger text-white ring-danger'
                    : 'bg-white ring-line hover:ring-accent',
              )}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Run an exercise set: one question at a time, with hint, Japanese and a teacher reveal. */
export function Runner({ set }: { set: ExerciseSet }) {
  const [i, setI] = useState(0)
  const [reveal, setReveal] = useState(false)
  const [hint, setHint] = useState(false)
  const [ja, setJa] = useState(false)
  const [result, setResult] = useState<Result>(null)
  const ex = set.exercises[i]
  const go = (d: number) => {
    setI((x) => Math.max(0, Math.min(set.exercises.length - 1, x + d)))
    setReveal(false)
    setHint(false)
    setResult(null)
  }
  if (!ex) return null
  const key = `${set.id}-${i}`
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 sm:p-6">
      {set.grammarPoint && <GrammarCard point={set.grammarPoint} collapsible />}
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-xl bg-surface px-3 py-1.5 text-lg font-bold shadow-sm ring-1 ring-line tabular-nums">
          {i + 1} / {set.exercises.length}
        </span>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent-strong">
          {ex.type === 'reorder' ? 'Put the words in order' : ex.type === 'cloze' ? 'Fill in the blank' : 'Choose the answer'}
        </span>
      </div>
      <div className="rounded-[2rem] bg-white/80 p-5 shadow-pop ring-1 ring-line sm:p-8">
        {ex.type === 'reorder' ? (
          <Reorder key={key} ex={ex} reveal={reveal} onResult={setResult} />
        ) : ex.type === 'cloze' ? (
          <Cloze key={key} ex={ex} reveal={reveal} onResult={setResult} />
        ) : (
          <Choice key={key} ex={ex} reveal={reveal} onResult={setResult} />
        )}
        <div className="mt-5 min-h-10 text-center text-3xl font-black" aria-live="polite">
          {result === 'right' && (
            <span className="text-success">
              <Check className="inline" size={30} aria-hidden /> Correct!
            </span>
          )}
          {result === 'wrong' && (
            <span className="text-danger">
              <X className="inline" size={30} aria-hidden /> Not quite. Try again!
            </span>
          )}
        </div>
        {(hint || ja) && (
          <div className="mt-2 space-y-2 rounded-2xl bg-canvas p-4 text-lg" lang="ja">
            {ja && ex.translation && <p className="font-semibold">{ex.translation}</p>}
            {hint && ex.hint && (
              <p className="text-ink-soft">
                <Bold text={stripCitations(ex.hint)} />
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <BigButton onClick={() => go(-1)} disabled={i === 0} aria-label="Previous question">
          <ChevronLeft size={24} aria-hidden /> Previous
        </BigButton>
        <BigButton onClick={() => setHint((h) => !h)} aria-pressed={hint} disabled={!ex.hint}>
          <Lightbulb size={22} aria-hidden /> Hint
        </BigButton>
        <BigButton onClick={() => setJa((v) => !v)} aria-pressed={ja} disabled={!ex.translation}>
          <Languages size={22} aria-hidden /> 日本語
        </BigButton>
        <BigButton onClick={() => setReveal(true)} disabled={reveal}>
          <Eye size={22} aria-hidden /> Show answer
        </BigButton>
        <BigButton tone="primary" onClick={() => go(1)} disabled={i >= set.exercises.length - 1} aria-label="Next question">
          Next <ChevronRight size={24} aria-hidden />
        </BigButton>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { boldParts, stripCitations, type GrammarPoint } from './data'

/** Text with **bold** markers rendered as <strong> (never HTML). */
export function Bold({ text }: { text: string }) {
  return (
    <>
      {boldParts(text).map((p, i) =>
        p.bold ? (
          <strong key={i} className="font-black text-accent-strong">
            {p.text}
          </strong>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}

export function GrammarCard({ point, collapsible = false }: { point: GrammarPoint; collapsible?: boolean }) {
  const [open, setOpen] = useState(!collapsible)
  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <button
        type="button"
        disabled={!collapsible}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 text-left disabled:cursor-default"
      >
        <span className="shrink-0 rounded-lg bg-accent-soft px-2 py-1 text-xs font-bold text-accent-strong">{point.ksNumber}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl leading-snug font-bold">
            <Bold text={point.title} />
          </span>
          <span className="text-sm text-ink-faint">
            {point.sectionName} · p.{point.page}
          </span>
        </span>
        {collapsible && <ChevronDown size={20} aria-hidden className={cn('mt-1 shrink-0 transition-transform', open && 'rotate-180')} />}
      </button>
      {open && (
        <div className="mt-4 space-y-3 text-[15px] leading-relaxed">
          {point.japaneseDescription && (
            <p lang="ja">
              <Bold text={point.japaneseDescription} />
            </p>
          )}
          {point.englishExplanation && (
            <p className="text-ink-soft">
              <Bold text={stripCitations(point.englishExplanation)} />
            </p>
          )}
          {point.examples?.length > 0 && (
            <ul className="space-y-1 rounded-2xl bg-canvas p-3">
              {point.examples.map((e, i) => (
                <li key={i} className="text-lg">
                  <Bold text={e} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

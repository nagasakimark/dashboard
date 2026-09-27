import { cn } from '@/lib/cn'
import type { Card } from '../data'
import { CardImage } from '../ui'

/** Choose which cards to play with (Missing, Memory Match). */
export function CardPicker({
  cards,
  selected,
  max,
  onChange,
}: {
  cards: Card[]
  selected: number[]
  max: number
  onChange: (s: number[]) => void
}) {
  const toggle = (i: number) =>
    onChange(
      selected.includes(i)
        ? selected.length > 1
          ? selected.filter((x) => x !== i)
          : selected
        : selected.length >= max
          ? selected
          : [...selected, i],
    )
  return (
    <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl bg-surface/80 p-3 ring-1 ring-line">
      <p className="mb-2 text-sm font-bold text-ink-soft">
        {selected.length} / {max} selected
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
        {cards.map((c, i) => (
          <button
            key={`${c.en}-${i}`}
            type="button"
            aria-pressed={selected.includes(i)}
            onClick={() => toggle(i)}
            className={cn(
              'overflow-hidden rounded-2xl border-2 bg-white text-left',
              selected.includes(i) ? 'border-accent ring-2 ring-accent-soft' : 'border-line hover:border-accent-muted',
            )}
          >
            <span className="block aspect-[4/3] p-1.5">
              <CardImage card={c} />
            </span>
            <span className="block truncate px-2 pb-1.5 text-sm font-bold">{c.en}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

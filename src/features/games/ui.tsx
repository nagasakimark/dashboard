import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Flame, Hash, Trophy } from 'lucide-react'
import { cn } from '@/lib/cn'
import { imageUrl, type Card } from './data'

/** A card's picture, or its first letter when it has none. */
export function CardImage({ card, className, alt = '' }: { card: Card; className?: string; alt?: string }) {
  const url = imageUrl(card.img)
  return url ? (
    <img src={url} alt={alt} draggable={false} className={cn('size-full object-contain', className)} />
  ) : (
    <span
      className={cn('grid size-full place-items-center text-[clamp(3rem,12vw,8rem)] font-black text-ink/15 select-none', className)}
      aria-hidden
    >
      {card.en[0]?.toUpperCase()}
    </span>
  )
}

/** Japanese line under a word (with reading when the data has one). */
export function Japanese({ card, className }: { card: Card; className?: string }) {
  if (!card.ja) return null
  return (
    <div className={cn('text-center', className)} lang="ja">
      <div className="font-bold text-accent-strong">{card.ja}</div>
      {card.kana && card.kana !== card.ja && <div className="text-[0.6em] text-accent">{card.kana}</div>}
    </div>
  )
}

export function ScoreBar({ streak, best, rounds, children }: { streak: number; best: number; rounds: number; children?: ReactNode }) {
  const item = 'flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-base font-bold shadow-sm ring-1 ring-line tabular-nums'
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" aria-live="polite">
      <span className={item} title="Streak">
        <Flame size={18} className="text-orange-500" aria-hidden /> <span className="sr-only">Streak</span>
        {streak}
      </span>
      <span className={item} title="Best streak">
        <Trophy size={18} className="text-amber-500" aria-hidden /> <span className="sr-only">Best</span>
        {best}
      </span>
      <span className={item} title="Rounds">
        <Hash size={18} className="text-ink-faint" aria-hidden /> <span className="sr-only">Rounds</span>
        {rounds}
      </span>
      {children}
    </div>
  )
}

/** Large, projector-friendly button. */
export function BigButton({
  className,
  tone = 'plain',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'plain' | 'primary' }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-6 text-xl font-bold transition-[transform,background,box-shadow] active:scale-[0.97] disabled:opacity-40',
        tone === 'primary'
          ? 'bg-accent text-white shadow-md hover:bg-accent-strong'
          : 'bg-surface text-ink shadow-sm ring-1 ring-line hover:ring-accent-muted',
        className,
      )}
      {...props}
    />
  )
}

export function NotEnough({ need, what = 'cards' }: { need: number; what?: string }) {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div className="max-w-md rounded-3xl bg-surface p-8 shadow-pop">
        <h2 className="text-2xl font-black">
          Need at least {need === 4 ? 'four' : need} {what}
        </h2>
        <p className="mt-2 text-ink-soft">Choose a bigger set, or turn on “with previous units”.</p>
      </div>
    </div>
  )
}

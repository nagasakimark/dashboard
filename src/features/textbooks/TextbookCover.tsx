import type { Textbook } from '@/data/schema'
import { cn } from '@/lib/cn'

const GRADIENTS = [
  'from-indigo-500 to-cyan-500',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-violet-500 to-purple-600',
]

/** Cover image, or a tidy generated cover when none is set. */
export function TextbookCover({ book, className }: { book: Pick<Textbook, 'title' | 'cover'>; className?: string }) {
  if (book.cover) return <img src={book.cover} alt="" className={cn('aspect-[3/4] w-full rounded-xl object-cover shadow-sm', className)} />
  const g = GRADIENTS[[...book.title].reduce((n, c) => n + c.charCodeAt(0), 0) % GRADIENTS.length]
  const number = /\d+/.exec(book.title)?.[0]
  return (
    <div
      className={cn(
        'flex aspect-[3/4] w-full flex-col justify-between rounded-xl bg-gradient-to-br p-3 text-white shadow-sm',
        g,
        className,
      )}
      aria-hidden
    >
      <span className="line-clamp-3 text-sm leading-tight font-bold">{book.title.replace(/\s*\(\d{4}\)$/, '')}</span>
      {number && <span className="self-end text-4xl font-black opacity-80">{number}</span>}
    </div>
  )
}

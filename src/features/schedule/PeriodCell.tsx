import type { CSSProperties, ReactNode } from 'react'
import { Plus } from 'lucide-react'
import type { LessonPlan, Period, School, Slot } from '@/data/schema'
import { cn } from '@/lib/cn'
import { periodSubtitle, periodTitle, slotLabel } from './model'

interface Props {
  slot: Slot
  period: Period | undefined
  school: School | undefined
  plans: Map<string, LessonPlan>
  times: { start: string; end: string } | null
  compact?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/** Visual content of one period slot (used by week and agenda views). */
export function PeriodCellContent({ slot, period, school, plans, times, compact, className, style }: Props) {
  const color = school?.color ?? 'var(--color-accent)'
  const isLunch = slot === 'lunch'
  const subtitle = period ? periodSubtitle(period, plans) : ''

  return (
    <div
      className={cn('relative flex h-full min-h-0 w-full flex-col overflow-hidden px-2 py-1.5 text-left', className)}
      style={style}
      title={subtitle || undefined}
    >
      <div className="flex items-baseline justify-between gap-2 text-[11px] leading-none text-ink-faint">
        <span className="font-semibold">{slotLabel(slot, true)}</span>
        {times && (
          <span className="tabular-nums">
            {times.start}
            {!compact && times.end && `–${times.end}`}
          </span>
        )}
      </div>
      {period ? (
        <div className="mt-1 min-w-0">
          {period.kind === 'class' ? (
            <span
              className={cn('font-extrabold tracking-tight', isLunch ? 'text-sm' : compact ? 'text-base' : 'text-lg')}
              style={{ color }}
            >
              {isLunch && <span className="mr-1 text-[11px] font-semibold text-ink-faint">Lunch</span>}
              {periodTitle(period)}
            </span>
          ) : (
            <span className="inline-flex max-w-full rounded-md bg-ink/6 px-1.5 py-0.5 text-xs font-semibold text-ink-soft">
              <span className="truncate">{periodTitle(period)}</span>
            </span>
          )}
          {subtitle && (
            <p className={cn('mt-0.5 text-xs leading-snug text-ink-soft', compact ? 'line-clamp-1' : 'line-clamp-2')}>{subtitle}</p>
          )}
        </div>
      ) : (
        <span className="mt-1 flex items-center gap-1 text-xs text-ink-faint/70 opacity-0 transition-opacity group-hover:opacity-100">
          <Plus size={13} aria-hidden /> Add
        </span>
      )}
    </div>
  )
}

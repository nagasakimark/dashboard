import type { CSSProperties, ReactNode } from 'react'
import { Plus } from 'lucide-react'
import type { LessonPlan, Period, School, Slot } from '@/data/schema'
import { cn } from '@/lib/cn'
import { ClampText } from './ClampText'
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
  const subtitle = period ? periodSubtitle(period, plans) : ''

  return (
    <div
      className={cn('relative flex h-full min-h-0 w-full flex-col overflow-hidden px-2 py-1.5 text-left', className)}
      style={style}
      title={subtitle || undefined}
    >
      <div className="grid grid-cols-[1fr_minmax(0,max-content)_1fr] items-center gap-1.5 text-[11px] leading-none text-ink-faint">
        <span className="font-semibold">{slotLabel(slot, true)}</span>
        <span className="min-w-0 text-center">
          {period?.kind === 'class' ? (
            <span className={cn('block truncate font-extrabold tracking-tight', compact ? 'text-sm' : 'text-[15px]')} style={{ color }}>
              {periodTitle(period)}
            </span>
          ) : period ? (
            <span className="inline-flex max-w-full rounded-md bg-ink/6 px-1.5 py-0.5 text-xs font-semibold text-ink-soft">
              <span className="truncate">{periodTitle(period)}</span>
            </span>
          ) : null}
        </span>
        <span className="text-right whitespace-nowrap tabular-nums">
          {times && (
            <>
              {times.start}
              {!compact && times.end && `–${times.end}`}
            </>
          )}
        </span>
      </div>
      {period ? (
        subtitle && <ClampText text={subtitle} className="mt-1 text-center text-xs leading-snug text-ink-soft" />
      ) : (
        <span className="mt-1 flex items-center justify-center gap-1 text-xs text-ink-faint/70 opacity-0 transition-opacity group-hover:opacity-100">
          <Plus size={13} aria-hidden /> Add
        </span>
      )}
    </div>
  )
}

import type { HTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-card border border-line bg-surface shadow-card', className)} {...props} />
)

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  className?: string
}

export function CardHeader({ title, description, icon: Icon, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start gap-3 px-5 pt-4 pb-3', className)}>
      {Icon && (
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Icon size={18} aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  )
}

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
const tones: Record<Tone, string> = {
  neutral: 'bg-ink/6 text-ink-soft',
  accent: 'bg-accent-soft text-accent-strong',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-danger/10 text-danger',
}

export function Badge({
  tone = 'neutral',
  color,
  className,
  children,
}: {
  tone?: Tone
  /** Custom colour (e.g. a school colour); overrides tone. */
  color?: string
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        !color && tones[tone],
        className,
      )}
      style={
        color
          ? { backgroundColor: `color-mix(in oklab, ${color} 14%, white)`, color: `color-mix(in oklab, ${color} 80%, black)` }
          : undefined
      }
    >
      {children}
    </span>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Icon size={26} aria-hidden />
      </span>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block size-5 animate-spin rounded-full border-2 border-accent/25 border-t-accent', className)}
    />
  )
}

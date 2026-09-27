import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface TabItem<T extends string> {
  id: T
  label: ReactNode
  icon?: LucideIcon
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
  /** 'pill' = segmented control, 'line' = underlined tabs */
  variant?: 'pill' | 'line'
  label?: string
}

/** Accessible tab list (arrow-key navigation, roving tabindex). */
export function Tabs<T extends string>({ items, value, onChange, className, variant = 'pill', label }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = items.length - 1
    const next =
      e.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : e.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1
    if (next < 0) return
    e.preventDefault()
    refs.current[next]?.focus()
    onChange(items[next].id)
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'flex max-w-full overflow-x-auto [scrollbar-width:none]',
        variant === 'pill' ? 'gap-1 rounded-xl bg-ink/5 p-1' : 'gap-4 border-b border-line',
        className,
      )}
    >
      {items.map((item, i) => {
        const active = item.id === value
        const Icon = item.icon
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap transition-colors',
              variant === 'pill'
                ? cn('h-8 rounded-lg px-3', active ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink')
                : cn(
                    '-mb-px h-10 border-b-2 px-0.5',
                    active ? 'border-accent text-ink' : 'border-transparent text-ink-soft hover:text-ink',
                  ),
            )}
          >
            {Icon && <Icon size={15} aria-hidden />}
            {item.label}
            {item.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-[11px] leading-4', active ? 'bg-accent-soft text-accent-strong' : 'bg-ink/8')}>
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

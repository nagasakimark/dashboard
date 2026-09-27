import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PageProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  /** Constrain content width (default) or use the full width (calendars). */
  width?: 'default' | 'wide' | 'full'
  className?: string
}

/** Standard page frame: sticky header with title + actions, padded content. */
export function Page({ title, description, actions, children, width = 'default', className }: PageProps) {
  const max = width === 'full' ? 'max-w-none' : width === 'wide' ? 'max-w-7xl' : 'max-w-5xl'
  return (
    <div className="flex min-h-full flex-col">
      <header className="safe-top sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur">
        <div className={cn('mx-auto flex w-full items-center gap-3 px-4 py-3 sm:px-6 md:py-4', max)}>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight text-ink md:text-2xl">{title}</h1>
            {description && <p className="mt-0.5 hidden truncate text-sm text-ink-soft sm:block">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </header>
      <div className={cn('mx-auto w-full flex-1 px-4 py-5 sm:px-6 md:py-6', max, className)}>{children}</div>
    </div>
  )
}

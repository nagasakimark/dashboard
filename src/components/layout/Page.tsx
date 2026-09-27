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
  /**
   * Fill the window exactly (no page scroll); content gets the remaining height.
   * `true`: tablets and up. `'always'`: phones too (above the bottom tab bar).
   */
  fill?: boolean | 'always'
  /** Extra controls on the header's left, after the title (e.g. view tabs). */
  tools?: ReactNode
}

/** Standard page frame: sticky header with title + actions, padded content. */
export function Page({ title, description, actions, children, width = 'default', className, fill = false, tools }: PageProps) {
  const max = width === 'full' ? 'max-w-none' : width === 'wide' ? 'max-w-7xl' : 'max-w-5xl'
  return (
    <div
      className={cn(
        'flex min-h-full flex-col',
        fill && 'md:h-dvh md:min-h-0',
        fill === 'always' && 'h-[calc(100dvh-4.25rem-env(safe-area-inset-bottom))] min-h-0',
      )}
    >
      <header className="safe-top sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur">
        <div className={cn('mx-auto flex w-full items-center gap-3 px-4 py-3 sm:px-6 md:py-4', max)}>
          <div className={cn('min-w-0', !tools && 'flex-1')}>
            <h1 className="truncate text-xl font-bold tracking-tight text-ink md:text-2xl">{title}</h1>
            {description && <p className="mt-0.5 hidden truncate text-sm text-ink-soft sm:block">{description}</p>}
          </div>
          {tools && <div className="hidden min-w-0 flex-1 items-center md:flex">{tools}</div>}
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </header>
      <div
        className={cn(
          'mx-auto w-full flex-1 px-4 py-5 sm:px-6 md:py-6',
          fill && 'md:flex md:min-h-0 md:flex-col md:py-3',
          fill === 'always' && 'flex min-h-0 flex-col py-3',
          max,
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

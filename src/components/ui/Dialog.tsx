import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from './Button'

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full'
const widths: Record<Size, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-[min(96vw,1400px)]',
}

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: Size
  /** Prevent closing via Esc / backdrop (e.g. while saving). */
  dismissible?: boolean
  className?: string
}

/**
 * Modal built on the native <dialog> element (focus trapping, Esc and
 * inertness come for free). Renders as a bottom sheet on phones.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', dismissible = true, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        if (dismissible) onClose()
      }}
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose()
      }}
      className={cn(
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none bg-transparent p-0 text-ink backdrop:animate-fade-in',
        'sm:m-auto sm:max-h-[88dvh]',
        widths[size],
      )}
    >
      {open && (
        <div
          className={cn(
            'flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-surface shadow-pop animate-slide-up',
            'sm:max-h-[88dvh] sm:rounded-3xl sm:animate-pop-in',
            className,
          )}
        >
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-ink/12 sm:hidden" aria-hidden />
          <header className="flex items-start gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-ink">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
            </div>
            {dismissible && <IconButton icon={X} label="Close" size="sm" onClick={onClose} className="-mr-1" />}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
          {footer && (
            <footer className="safe-bottom flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3 sm:px-6">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}

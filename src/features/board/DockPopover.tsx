import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * A small window that opens above a dock button, like the old dashboard's
 * panels. Closes on Escape or a click elsewhere (except on its own button).
 */
export function DockPopover({
  anchor,
  title,
  icon: Icon,
  onClose,
  className,
  actions,
  children,
}: {
  anchor: HTMLElement | null
  title: string
  icon: LucideIcon
  onClose: () => void
  className?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)

  useLayoutEffect(() => {
    const place = () => {
      const el = ref.current
      if (!anchor || !el) return
      const a = anchor.getBoundingClientRect()
      const dock = anchor.closest('nav')?.getBoundingClientRect() ?? a
      const w = el.offsetWidth
      const left = Math.min(Math.max(12, a.left + a.width / 2 - w / 2), window.innerWidth - w - 12)
      setPos({ left, bottom: window.innerHeight - dock.top + 10 })
    }
    place()
    const ro = new ResizeObserver(place)
    if (ref.current) ro.observe(ref.current)
    window.addEventListener('resize', place)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [anchor])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      // Dialogs opened from inside the popover (e.g. "Add bookmark") live elsewhere in the DOM.
      if (ref.current?.contains(t) || anchor?.contains(t) || (t instanceof Element && t.closest('dialog, [role="status"]'))) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onClose()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchor, onClose])

  return (
    <section
      ref={ref}
      role="dialog"
      aria-label={title}
      style={pos ? { left: pos.left, bottom: pos.bottom } : { visibility: 'hidden', left: 0, bottom: 80 }}
      className={cn(
        'fixed z-[9600] flex max-h-[min(72vh,calc(100dvh-7rem))] max-w-[calc(100vw-1.5rem)] animate-pop-in flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 text-ink shadow-2xl backdrop-blur-xl',
        className,
      )}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-100 py-2 pr-2 pl-3.5">
        <Icon size={15} className="text-accent" aria-hidden />
        <h2 className="flex-1 text-xs font-black tracking-[0.16em] text-slate-700 uppercase">{title}</h2>
        {actions}
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={15} aria-hidden />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </section>
  )
}

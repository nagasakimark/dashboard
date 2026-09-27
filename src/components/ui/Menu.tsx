import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface MenuItem {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

interface MenuProps {
  /** Render prop for the trigger; spread the props onto a button. */
  trigger: (props: { 'aria-haspopup': 'menu'; 'aria-expanded': boolean; 'aria-controls': string; onClick: () => void }) => ReactNode
  items: (MenuItem | 'divider')[]
  align?: 'start' | 'end'
  className?: string
}

/** Dropdown menu with keyboard support and click-outside dismissal. */
export function Menu({ trigger, items, align = 'end', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    list.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus()
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const onKeyDown = (e: KeyboardEvent) => {
    const buttons = [...(list.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])]
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      root.current?.querySelector<HTMLButtonElement>('[aria-haspopup]')?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = e.key === 'ArrowDown' ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length
      buttons[next]?.focus()
    }
  }

  return (
    <div ref={root} className={cn('relative inline-block', className)} onKeyDown={onKeyDown}>
      {trigger({ 'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-controls': id, onClick: () => setOpen((o) => !o) })}
      {open && (
        <div
          ref={list}
          id={id}
          role="menu"
          className={cn(
            'absolute z-50 mt-1 min-w-48 animate-pop-in rounded-xl border border-line bg-surface p-1 shadow-pop',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) =>
            item === 'divider' ? (
              <div key={`d${i}`} role="separator" className="my-1 h-px bg-line" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors focus:outline-none disabled:opacity-40',
                  item.danger ? 'text-danger hover:bg-danger/8 focus:bg-danger/8' : 'text-ink hover:bg-ink/5 focus:bg-ink/5',
                )}
              >
                {item.icon && <item.icon size={16} aria-hidden className={item.danger ? '' : 'text-ink-soft'} />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

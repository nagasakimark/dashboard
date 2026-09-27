import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink shadow-xs placeholder:text-ink-faint transition-colors hover:border-ink-faint/60 focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15 disabled:opacity-60'

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(control, 'h-10', className)} {...props} />
)

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(control, 'min-h-24 py-2 leading-relaxed', className)} {...props} />
)

export const Select = ({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select className={cn(control, 'h-10 appearance-none pr-9', className)} {...props}>
      {children}
    </select>
    <ChevronDown size={16} aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-faint" />
  </div>
)

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string
  className?: string
  children: (id: string) => ReactNode
}

/** Label + control + hint/error, with the ids wired up for accessibility. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId()
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
    </div>
  )
}

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-faint">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-ink/15')}
      >
        <span
          className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')}
        />
      </button>
    </label>
  )
}

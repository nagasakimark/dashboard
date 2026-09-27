import { cn } from '@/lib/cn'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
export type Size = 'sm' | 'md' | 'lg'

export const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white shadow-sm hover:bg-accent-strong',
  secondary: 'bg-surface text-ink border border-line shadow-sm hover:bg-canvas',
  subtle: 'bg-accent-soft text-accent-strong hover:bg-accent-muted',
  ghost: 'text-ink-soft hover:bg-ink/5 hover:text-ink',
  danger: 'bg-danger text-white shadow-sm hover:brightness-95',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
}

const base =
  'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-[background,color,filter,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

/** Class names for button styling (e.g. on links). */
export const buttonClass = ({
  variant = 'secondary',
  size = 'md',
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) => cn(base, variants[variant], sizes[size], className)

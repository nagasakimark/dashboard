import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
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

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  iconRight?: LucideIcon
  children?: ReactNode
}

const base =
  'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-[background,color,filter,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

/** Class names for button styling (e.g. on links). */
const buttonClass = ({ variant = 'secondary', size = 'md', className }: { variant?: Variant; size?: Size; className?: string } = {}) =>
  cn(base, variants[variant], sizes[size], className)

type ButtonLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  iconRight?: LucideIcon
  children?: ReactNode
} & ({ to: string; href?: never } | { href: string; to?: never })

/** A link that looks like a button: an in-app route (`to`) or a URL (`href`). */
export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  to,
  href,
  ...props
}: ButtonLinkProps) {
  const iconSize = size === 'sm' ? 15 : 17
  const content = (
    <>
      {Icon && <Icon size={iconSize} aria-hidden />}
      {children}
      {IconRight && <IconRight size={iconSize} aria-hidden />}
    </>
  )
  const cls = buttonClass({ variant, size, className })
  if (to !== undefined)
    return (
      <Link to={to} className={cls} {...props}>
        {content}
      </Link>
    )
  const external = /^https?:/.test(href ?? '')
  return (
    <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} {...props}>
      {content}
    </a>
  )
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const iconSize = size === 'sm' ? 15 : 17
  return (
    <button type={type} className={buttonClass({ variant, size, className })} {...props}>
      {Icon && <Icon size={iconSize} aria-hidden />}
      {children}
      {IconRight && <IconRight size={iconSize} aria-hidden />}
    </button>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  variant?: Variant
  size?: Size
}

export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'md', className, type = 'button', ...props }: IconButtonProps) {
  const box = size === 'sm' ? 'size-8 rounded-lg' : size === 'lg' ? 'size-12 rounded-xl' : 'size-10 rounded-xl'
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition-[background,color,transform] active:scale-95 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        box,
        className,
      )}
      {...props}
    >
      <Icon size={size === 'sm' ? 16 : size === 'lg' ? 22 : 19} aria-hidden />
    </button>
  )
}

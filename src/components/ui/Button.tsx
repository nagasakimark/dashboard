import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { buttonClass, variants, type Size, type Variant } from './buttonClass'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  iconRight?: LucideIcon
  children?: ReactNode
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

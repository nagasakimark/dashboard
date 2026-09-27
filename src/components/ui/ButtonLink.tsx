import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { buttonClass, type Size, type Variant } from './buttonClass'

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

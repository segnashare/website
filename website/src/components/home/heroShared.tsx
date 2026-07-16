import Link from 'next/link'
import type {ReactNode} from 'react'

export function CtaHrefLink({
  href,
  className,
  children,
  onClick,
  ariaLabel,
  tabIndex,
}: {
  href: string
  className: string
  children: ReactNode
  onClick?: () => void
  /** Nom accessible (ex. libellé masqué visuellement sur mobile, flèche seule). */
  ariaLabel?: string
  tabIndex?: number
}) {
  const h = href.trim() || '#'
  const a11y = ariaLabel?.trim() ? {'aria-label': ariaLabel.trim()} : {}
  const ti = tabIndex !== undefined ? {tabIndex} : {}
  if (h.startsWith('/')) {
    return (
      <Link href={h} className={className} onClick={onClick} {...a11y} {...ti}>
        {children}
      </Link>
    )
  }
  if (/^https?:\/\//i.test(h)) {
    return (
      <a href={h} className={className} rel="noopener noreferrer" onClick={onClick} {...a11y} {...ti}>
        {children}
      </a>
    )
  }
  return (
    <Link href={h} className={className} onClick={onClick} {...a11y} {...ti}>
      {children}
    </Link>
  )
}

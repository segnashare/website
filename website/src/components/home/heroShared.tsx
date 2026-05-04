import Link from 'next/link'
import type {ReactNode} from 'react'

export function CtaHrefLink({
  href,
  className,
  children,
  onClick,
  ariaLabel,
}: {
  href: string
  className: string
  children: ReactNode
  onClick?: () => void
  /** Nom accessible (ex. libellé masqué visuellement sur mobile, flèche seule). */
  ariaLabel?: string
}) {
  const h = href.trim() || '#'
  const a11y = ariaLabel?.trim() ? {'aria-label': ariaLabel.trim()} : {}
  if (h.startsWith('/')) {
    return (
      <Link href={h} className={className} onClick={onClick} {...a11y}>
        {children}
      </Link>
    )
  }
  if (/^https?:\/\//i.test(h)) {
    return (
      <a href={h} className={className} rel="noopener noreferrer" onClick={onClick} {...a11y}>
        {children}
      </a>
    )
  }
  return (
    <Link href={h} className={className} onClick={onClick} {...a11y}>
      {children}
    </Link>
  )
}

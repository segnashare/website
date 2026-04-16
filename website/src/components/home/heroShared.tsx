import Link from 'next/link'
import type {ReactNode} from 'react'

export function CtaHrefLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string
  className: string
  children: ReactNode
  onClick?: () => void
}) {
  const h = href.trim() || '#'
  if (h.startsWith('/')) {
    return (
      <Link href={h} className={className} onClick={onClick}>
        {children}
      </Link>
    )
  }
  if (/^https?:\/\//i.test(h)) {
    return (
      <a href={h} className={className} rel="noopener noreferrer" onClick={onClick}>
        {children}
      </a>
    )
  }
  return (
    <Link href={h} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}

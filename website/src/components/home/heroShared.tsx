'use client'

import {JoinClubCtaLink} from '@/components/home/JoinClubCtaLink'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {normalizeHref} from '@/lib/normalize-href'
import Link from 'next/link'
import type {ReactNode} from 'react'

function isAuthAwareClubHref(href: string): boolean {
  const h = href.trim()
  return (
    h === '/signup' ||
    h.startsWith('/signup?') ||
    h === '/abonnement' ||
    h.startsWith('/abonnement/') ||
    h.startsWith('/abonnement?')
  )
}

export function CtaHrefLink({
  href,
  className,
  children,
  onClick,
  ariaLabel,
  tabIndex,
  placement = 'cta',
}: {
  href: string
  className: string
  children: ReactNode
  onClick?: () => void
  /** Nom accessible (ex. libellé masqué visuellement sur mobile, flèche seule). */
  ariaLabel?: string
  tabIndex?: number
  placement?: string
}) {
  const h = normalizeHref(href)

  const trackClick = () => {
    trackWebsiteEvent('cta_clicked', {
      cta_href: h,
      cta_label: ariaLabel?.trim() || undefined,
      placement,
    })
    onClick?.()
  }

  // Signup / abonnement : si déjà connecté → récap activation (pas la page signup).
  if (h.startsWith('/') && isAuthAwareClubHref(h)) {
    return (
      <JoinClubCtaLink
        href={h}
        className={className}
        onClick={onClick}
        ariaLabel={ariaLabel}
        tabIndex={tabIndex}
        placement={placement}
      >
        {children}
      </JoinClubCtaLink>
    )
  }

  const a11y = ariaLabel?.trim() ? {'aria-label': ariaLabel.trim()} : {}
  const ti = tabIndex !== undefined ? {tabIndex} : {}
  if (h.startsWith('/')) {
    return (
      <Link href={h} className={className} onClick={trackClick} {...a11y} {...ti}>
        {children}
      </Link>
    )
  }
  if (/^https?:\/\//i.test(h) || h.startsWith('//')) {
    return (
      <a href={h} className={className} rel="noopener noreferrer" onClick={trackClick} {...a11y} {...ti}>
        {children}
      </a>
    )
  }
  return (
    <Link href={h} className={className} onClick={trackClick} {...a11y} {...ti}>
      {children}
    </Link>
  )
}

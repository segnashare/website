'use client'

import {hasActivePaidSubscription} from '@/lib/auth/has-active-subscription'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {WEBSITE_LOCATION_PATH, WEBSITE_SUBSCRIPTION_RECAP_PATH} from '@/lib/cart/paths'
import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useCallback, type MouseEvent, type ReactNode} from 'react'

type Props = {
  href: string
  className: string
  children: ReactNode
  onClick?: () => void
  ariaLabel?: string
  tabIndex?: number
  /** PostHog placement hint (nav, hero, …). */
  placement?: string
}

function isSignupHref(href: string): boolean {
  const h = href.trim()
  return h === '/signup' || h.startsWith('/signup?')
}

function guestDestination(href: string): string {
  const h = href.trim() || WEBSITE_LOCATION_PATH
  if (isSignupHref(h)) {
    return `/signup?next=${encodeURIComponent(WEBSITE_SUBSCRIPTION_RECAP_PATH)}`
  }
  if (h === '/abonnement' || h.startsWith('/abonnement/') || h.startsWith('/abonnement?')) {
    // Landing marketing redirigée ; funnel activation = récap.
    if (h === '/abonnement/recap' || h.startsWith('/abonnement/recap?')) return h
    if (h === '/abonnement/succes' || h.startsWith('/abonnement/succes?')) return h
    return WEBSITE_LOCATION_PATH
  }
  return h
}

async function redirectSubscribedToApp(): Promise<void> {
  try {
    const supabase = createSupabaseBrowserClient()
    const {data} = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    const refreshToken = data.session?.refresh_token
    if (accessToken && refreshToken) {
      const target = new URL('/auth/handoff', SEGNA_APP_BASE_URL)
      target.hash = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        type: 'website_signin',
      }).toString()
      trackWebsiteEvent('app_open_intent', {
        destination: 'app_handoff',
        href: target.toString(),
        placement: 'join_club_subscribed',
      })
      window.location.assign(target.toString())
      return
    }
  } catch {
    // fallback below
  }
  const loginHref = `${SEGNA_APP_BASE_URL}/auth/login?from=member`
  trackWebsiteEvent('app_open_intent', {
    destination: 'app_handoff',
    href: loginHref,
    placement: 'join_club_subscribed_fallback',
  })
  window.location.assign(loginHref)
}

/**
 * CTA nav « Rejoindre le club » / liens signup marketing :
 * - non connecté → href CMS (souvent `/location` ou signup → récap)
 * - connecté sans abo → `/abonnement/recap`
 * - déjà abonné → app
 */
export function JoinClubCtaLink({
  href,
  className,
  children,
  onClick,
  ariaLabel,
  tabIndex,
  placement = 'join_club',
}: Props) {
  const router = useRouter()
  const fallbackHref = guestDestination(href)

  const handleClick = useCallback(
    async (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      trackWebsiteEvent('cta_clicked', {
        cta_href: fallbackHref,
        cta_label: ariaLabel?.trim() || undefined,
        placement,
      })
      onClick?.()
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: {user},
        } = await supabase.auth.getUser()

        if (!user) {
          router.push(fallbackHref)
          return
        }

        if (await hasActivePaidSubscription(supabase)) {
          await redirectSubscribedToApp()
          return
        }

        router.push(WEBSITE_SUBSCRIPTION_RECAP_PATH)
      } catch {
        router.push(fallbackHref)
      }
    },
    [ariaLabel, fallbackHref, onClick, placement, router],
  )

  const a11y = ariaLabel?.trim() ? {'aria-label': ariaLabel.trim()} : {}
  const ti = tabIndex !== undefined ? {tabIndex} : {}

  return (
    <Link href={fallbackHref} className={className} onClick={handleClick} {...a11y} {...ti}>
      {children}
    </Link>
  )
}

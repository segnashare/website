'use client'

import {hasActivePaidSubscription} from '@/lib/auth/has-active-subscription'
import {WEBSITE_SUBSCRIPTION_PATH, WEBSITE_SUBSCRIPTION_RECAP_PATH} from '@/lib/cart/paths'
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
}

function guestDestination(href: string): string {
  const h = href.trim() || WEBSITE_SUBSCRIPTION_PATH
  // Landing abo / signup générique → signup avec next = récap.
  if (
    h === WEBSITE_SUBSCRIPTION_PATH ||
    h.startsWith(`${WEBSITE_SUBSCRIPTION_PATH}?`) ||
    h === '/signup' ||
    h.startsWith('/signup?')
  ) {
    return `/signup?next=${encodeURIComponent(WEBSITE_SUBSCRIPTION_RECAP_PATH)}`
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
      window.location.assign(target.toString())
      return
    }
  } catch {
    // fallback below
  }
  window.location.assign(`${SEGNA_APP_BASE_URL}/auth/login?from=member`)
}

/**
 * CTA nav « Rejoindre le club » :
 * - non connecté → signup (next = récap) ou href CMS
 * - connecté sans abo → `/abonnement/recap`
 * - déjà abonné → app
 */
export function JoinClubCtaLink({href, className, children, onClick, ariaLabel, tabIndex}: Props) {
  const router = useRouter()
  const fallbackHref = guestDestination(href)

  const handleClick = useCallback(
    async (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
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
    [fallbackHref, onClick, router],
  )

  const a11y = ariaLabel?.trim() ? {'aria-label': ariaLabel.trim()} : {}
  const ti = tabIndex !== undefined ? {tabIndex} : {}

  return (
    <Link href={fallbackHref} className={className} onClick={handleClick} {...a11y} {...ti}>
      {children}
    </Link>
  )
}

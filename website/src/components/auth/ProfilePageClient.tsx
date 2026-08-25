'use client'

import {ProfileReferralCard} from '@/components/auth/ProfileReferralCard'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {redirectToAppWithSession} from '@/lib/auth/app-handoff'
import {buildAppHandoffUrl} from '@/lib/auth/build-app-handoff-url'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {
  openIosAppOrAppStore,
  SEGNA_APP_BASE_URL,
  SEGNA_APP_STORE_URL,
} from '@/lib/catalog/catalog-app-links'
import {detectClientPlatform} from '@/lib/platform/client-platform'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {
  getWebsiteOrderBadgeCount,
  setWebsiteOrderBadgeCount,
  subscribeWebsiteOrderBadge,
} from '@/lib/orders/website-order-badge'
import {fetchOngoingPurchaseOrderCount} from '@/lib/orders/fetch-ongoing-purchase-count'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useState} from 'react'
import styles from './profilePage.module.css'

type ProfileState = {
  firstName: string
  lastName: string
  referralCode: string | null
}

function formatMemberName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(' ')
}

function ChevronIcon() {
  return (
    <svg className={styles.chevron} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M7.5 4.5 13 10l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavRow({
  label,
  disabled,
  onClick,
  href,
  badgeCount,
}: {
  label: string
  disabled?: boolean
  onClick?: () => void
  href?: string
  badgeCount?: number
}) {
  const badge =
    badgeCount && badgeCount > 0 ? (
      <span className={styles.rowBadge} aria-hidden>
        {badgeCount > 9 ? '9+' : badgeCount}
      </span>
    ) : null

  if (href) {
    return (
      <Link href={href} className={styles.row}>
        <span className={styles.rowLabel}>{label}</span>
        {badge}
        <ChevronIcon />
      </Link>
    )
  }

  return (
    <button type="button" className={styles.row} disabled={disabled} onClick={onClick}>
      <span className={styles.rowLabel}>{label}</span>
      {badge}
      <ChevronIcon />
    </button>
  )
}

export function ProfilePageClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [profile, setProfile] = useState<ProfileState | null>(null)
  const [orderBadge, setOrderBadge] = useState(0)

  useEffect(() => {
    const sync = () => setOrderBadge(getWebsiteOrderBadgeCount())
    sync()
    return subscribeWebsiteOrderBadge(sync)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: {user},
        } = await supabase.auth.getUser()
        if (!user) {
          router.replace(`/signin?next=${encodeURIComponent('/profil')}`)
          return
        }

        const [{data: member}, {data: referral}, ongoingCount] = await Promise.all([
          supabase.from('users').select('first_name, last_name').eq('id', user.id).maybeSingle(),
          supabase.from('referrals_codes').select('code').eq('user_id', user.id).maybeSingle(),
          fetchOngoingPurchaseOrderCount(supabase, user.id),
        ])

        if (cancelled) return

        setWebsiteOrderBadgeCount(ongoingCount)

        const m = member as {first_name?: string | null; last_name?: string | null} | null
        const code =
          typeof (referral as {code?: string | null} | null)?.code === 'string'
            ? (referral as {code: string}).code.trim()
            : ''

        setProfile({
          firstName: typeof m?.first_name === 'string' ? m.first_name.trim() : '',
          lastName: typeof m?.last_name === 'string' ? m.last_name.trim() : '',
          referralCode: code || null,
        })
      } catch {
        if (!cancelled) router.replace(`/signin?next=${encodeURIComponent('/profil')}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const goApp = useCallback(async (path: string) => {
    setPending(true)
    try {
      await redirectToAppWithSession(path)
    } finally {
      setPending(false)
    }
  }, [])

  const downloadApp = useCallback(async () => {
    if (pending) return
    setPending(true)
    try {
      const appUrl = await buildAppHandoffUrl('/profile?tab=plus')
      trackWebsiteEvent('cta_clicked', {
        cta_label: 'Télécharger l’app',
        cta_href: appUrl || SEGNA_APP_STORE_URL || SEGNA_APP_BASE_URL,
        placement: 'profile_download_app',
      })
      trackWebsiteEvent('app_open_intent', {
        destination: SEGNA_APP_STORE_URL ? 'app_store' : 'app_handoff',
        href: appUrl || SEGNA_APP_STORE_URL || SEGNA_APP_BASE_URL,
        placement: 'profile_download_app',
      })
      if (detectClientPlatform() === 'ios' && SEGNA_APP_STORE_URL) {
        openIosAppOrAppStore(appUrl, SEGNA_APP_STORE_URL)
        return
      }
      if (SEGNA_APP_STORE_URL) {
        window.open(SEGNA_APP_STORE_URL, '_blank', 'noopener,noreferrer')
        return
      }
      window.location.assign(appUrl || `${SEGNA_APP_BASE_URL}/profile?tab=plus`)
    } catch {
      window.location.assign(SEGNA_APP_STORE_URL || SEGNA_APP_BASE_URL)
    } finally {
      setPending(false)
    }
  }, [pending])

  const signOut = useCallback(async () => {
    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
      window.location.assign('/')
    } catch {
      setPending(false)
    }
  }, [])

  if (loading || !profile) {
    return <WebsitePageLoading label="Chargement du profil" />
  }

  const displayName = formatMemberName(profile.firstName, profile.lastName)

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>{displayName || 'Mon profil'}</h1>
      </header>

      <div className={styles.layout}>
        <section className={styles.section} aria-label="Mon compte">
          <ul className={styles.list}>
            <li>
              <NavRow
                label="Commandes"
                href="/profil/commandes"
                badgeCount={orderBadge}
              />
            </li>
            <li>
              <NavRow
                label="Détails et sécurité"
                disabled={pending}
                onClick={() => void goApp('/profile/settings')}
              />
            </li>
            <li>
              <NavRow label="Préférences et communications" href="/profil/preferences" />
            </li>
          </ul>
        </section>

        <div className={styles.rightCol}>
          <ProfileReferralCard referralCode={profile.referralCode} />

          <button
            type="button"
            className={styles.appDownload}
            disabled={pending}
            onClick={() => void downloadApp()}
          >
            <span className={styles.appDownloadTitle}>Télécharger l’app</span>
            <span className={styles.appDownloadSubtitle}>
              Louez vos pièces, renouvelez quand vous voulez, et profitez d’avantages à l’achat.
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/app-store-badge.png"
              alt="Download on the App Store"
              className={styles.appDownloadBadge}
              width={180}
              height={52}
              decoding="async"
            />
          </button>
        </div>

        <button
          type="button"
          className={styles.signOut}
          disabled={pending}
          onClick={() => void signOut()}
        >
          Se déconnecter
        </button>
      </div>
    </main>
  )
}

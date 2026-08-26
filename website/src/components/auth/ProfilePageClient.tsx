'use client'

import {ProfileAppStoreFrame} from '@/components/auth/ProfileAppStoreFrame'
import {ProfileReferralCard} from '@/components/auth/ProfileReferralCard'
import {ProfileReviewsRow} from '@/components/auth/ProfileReviewsRow'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {hasActivePaidSubscription} from '@/lib/auth/has-active-subscription'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {
  getWebsiteOrderBadgeCount,
  setWebsiteOrderBadgeCount,
  subscribeWebsiteOrderBadge,
} from '@/lib/orders/website-order-badge'
import {fetchOngoingPurchaseOrderCount} from '@/lib/orders/fetch-ongoing-purchase-count'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useState, type ReactNode} from 'react'
import styles from './profilePage.module.css'

type ProfileState = {
  firstName: string
  lastName: string
  email: string
  isSubscriber: boolean
  referralCode: string | null
}

function AccountTile({
  title,
  description,
  href,
  badgeCount,
}: {
  title: string
  description: string
  href: string
  badgeCount?: number
}) {
  const badge =
    badgeCount && badgeCount > 0 ? (
      <span className={styles.tileBadge} aria-hidden>
        {badgeCount > 9 ? '9+' : badgeCount}
      </span>
    ) : null

  const body: ReactNode = (
    <>
      <span className={styles.tileTitleRow}>
        <span className={styles.tileTitle}>{title}</span>
        {badge}
      </span>
      <span className={styles.tileDescription}>{description}</span>
    </>
  )

  return (
    <Link href={href} className={styles.tile}>
      {body}
    </Link>
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

        const [{data: member}, {data: referral}, ongoingCount, isSubscriber] = await Promise.all([
          supabase.from('users').select('first_name, last_name, email').eq('id', user.id).maybeSingle(),
          supabase.from('referrals_codes').select('code').eq('user_id', user.id).maybeSingle(),
          fetchOngoingPurchaseOrderCount(supabase, user.id),
          hasActivePaidSubscription(supabase),
        ])

        if (cancelled) return

        setWebsiteOrderBadgeCount(ongoingCount)

        const m = member as {
          first_name?: string | null
          last_name?: string | null
          email?: string | null
        } | null
        const code =
          typeof (referral as {code?: string | null} | null)?.code === 'string'
            ? (referral as {code: string}).code.trim()
            : ''
        const email =
          (typeof m?.email === 'string' && m.email.trim()) || user.email?.trim() || ''

        setProfile({
          firstName: typeof m?.first_name === 'string' ? m.first_name.trim() : '',
          lastName: typeof m?.last_name === 'string' ? m.last_name.trim() : '',
          email,
          isSubscriber,
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
    return <WebsitePageLoading label="Chargement du compte" />
  }

  const firstName = profile.firstName || 'toi'
  const welcomeTitle = `Bienvenue sur ton compte, ${firstName}`

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{welcomeTitle}</h1>
          {profile.email ? <p className={styles.email}>{profile.email}</p> : null}
        </div>
        <button
          type="button"
          className={styles.signOutHeaderBtn}
          disabled={pending}
          onClick={() => void signOut()}
        >
          Se déconnecter
        </button>
      </header>

      <section className={styles.tilesSection} aria-label="Mon compte">
        <div className={styles.tilesGrid}>
          <AccountTile
            title="Commandes & retours"
            description="Suivre vos commandes ou organiser un retour"
            href="/profil/commandes"
            badgeCount={orderBadge}
          />
          <AccountTile
            title="Détails et sécurité"
            description="Gérer votre identifiant et mot de passe"
            href="/profil/details"
          />
          <AccountTile
            title="Abonnement (SegnaX)"
            description={
              profile.isSubscriber
                ? 'Gérer votre abonnement et vos factures'
                : 'Explorer vos avantages et activer SegnaX'
            }
            href="/profil/abonnement"
          />
        </div>
      </section>

      <div className={styles.belowStack}>
        <div className={styles.belowGrid}>
          <div className={styles.belowLeft}>
            <ProfileAppStoreFrame />
            <ProfileReviewsRow />
          </div>
          <div className={styles.belowRight}>
            <ProfileReferralCard referralCode={profile.referralCode} />
          </div>
        </div>
      </div>
    </main>
  )
}

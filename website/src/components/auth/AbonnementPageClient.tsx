'use client'

import {AccountSectionShell} from '@/components/auth/AccountSectionShell'
import {SubscriptionRecapClient} from '@/components/subscription/SubscriptionRecapClient'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {WaveDotsLoader} from '@/components/ui/WaveDotsLoader'
import {redirectToAppWithSession} from '@/lib/auth/app-handoff'
import {hasActivePaidSubscription} from '@/lib/auth/has-active-subscription'
import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useState} from 'react'
import styles from './abonnementPage.module.css'

type Props = {
  wallItems: RecapWallItem[]
}

export function AbonnementPageClient({wallItems}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [isSubscriber, setIsSubscriber] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: {user},
        } = await supabase.auth.getUser()
        if (!user) {
          router.replace(`/signin?next=${encodeURIComponent('/profil/abonnement')}`)
          return
        }
        const subscribed = await hasActivePaidSubscription(supabase)
        if (!cancelled) setIsSubscriber(subscribed)
      } catch {
        if (!cancelled) router.replace(`/signin?next=${encodeURIComponent('/profil/abonnement')}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const manageInApp = useCallback(async () => {
    if (pending) return
    setPending(true)
    try {
      await redirectToAppWithSession('/profile/settings/abonnement')
    } finally {
      setPending(false)
    }
  }, [pending])

  if (loading) {
    return <WebsitePageLoading label="Chargement de l’abonnement" />
  }

  if (isSubscriber) {
    return (
      <AccountSectionShell
        title="Abonnement (SegnaX)"
        lead="Gérer votre abonnement et vos factures."
        centerContent
      >
        <div className={styles.panel}>
          <p className={styles.status}>
            Votre abonnement <strong>SegnaX</strong> est actif.
          </p>
          <p className={styles.copy}>
            Factures, changement d’offre et résiliation se gèrent dans l’app Segna.
          </p>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={pending}
            onClick={() => void manageInApp()}
          >
            {pending ? <WaveDotsLoader /> : 'Gérer mon abonnement'}
          </button>
          <Link href="/profil/commandes" className={styles.secondaryLink}>
            Voir mes commandes
          </Link>
        </div>
      </AccountSectionShell>
    )
  }

  return (
    <AccountSectionShell title="Abonnement (SegnaX)" centerContent>
      <SubscriptionRecapClient
        wallItems={wallItems}
        embedded
        authNextPath="/profil/abonnement"
      />
    </AccountSectionShell>
  )
}

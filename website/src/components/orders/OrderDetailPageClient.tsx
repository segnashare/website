'use client'

import {AccountSectionShell} from '@/components/auth/AccountSectionShell'
import {OrderDetailBody} from '@/components/orders/OrderDetailBody'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {buildAppHandoffUrl} from '@/lib/auth/build-app-handoff-url'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {openIosAppOrAppStore, SEGNA_APP_STORE_URL} from '@/lib/catalog/catalog-app-links'
import {clearWebsiteCart} from '@/lib/cart/website-cart'
import {fetchMemberOrderDetail, type WebsiteOrderDetail} from '@/lib/orders/fetch-member-order-detail'
import {bumpWebsiteOrderBadge} from '@/lib/orders/website-order-badge'
import {detectClientPlatform} from '@/lib/platform/client-platform'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useRouter, useSearchParams} from 'next/navigation'
import {useCallback, useEffect, useState} from 'react'
import styles from './orderDetailPage.module.css'

type Props = {
  cartId: string
}

export function OrderDetailPageClient({cartId}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<WebsiteOrderDetail | null>(null)
  const [error, setError] = useState(false)
  const [appPending, setAppPending] = useState(false)

  useEffect(() => {
    if (searchParams.get('paid') !== '1') return
    try {
      clearWebsiteCart()
    } catch {
      // ignore
    }
    bumpWebsiteOrderBadge(cartId)
  }, [cartId, searchParams])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: {user},
        } = await supabase.auth.getUser()
        if (!user) {
          router.replace(
            `/signin?next=${encodeURIComponent(`/profil/commandes/${cartId}`)}`,
          )
          return
        }
        const detail = await fetchMemberOrderDetail(supabase, user.id, cartId)
        if (cancelled) return
        if (!detail) {
          setError(true)
          return
        }
        setOrder(detail)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cartId, router])

  const openInApp = useCallback(async () => {
    if (!order || appPending) return
    setAppPending(true)
    const path = order.appDetailPath
    try {
      const appUrl = await buildAppHandoffUrl(path)
      trackWebsiteEvent('cta_clicked', {
        cta_label: 'Gère ta commande',
        cta_href: appUrl,
        placement: 'order_detail_header',
      })
      trackWebsiteEvent('app_open_intent', {
        destination: 'app_handoff',
        href: appUrl,
        placement: 'order_detail_header',
      })
      if (detectClientPlatform() === 'ios') {
        openIosAppOrAppStore(appUrl, SEGNA_APP_STORE_URL)
        return
      }
      window.location.assign(appUrl)
    } catch {
      try {
        window.location.assign(await buildAppHandoffUrl(path))
      } catch {
        // ignore
      }
    } finally {
      setAppPending(false)
    }
  }, [appPending, order])

  if (loading) {
    return <WebsitePageLoading label="Chargement de la commande" />
  }

  return (
    <AccountSectionShell>
      <div className={styles.embedded}>
        {error || !order ? (
          <p className={styles.error}>Impossible de charger cette commande.</p>
        ) : (
          <OrderDetailBody
            order={order}
            onManage={() => void openInApp()}
            managePending={appPending}
          />
        )}
      </div>
    </AccountSectionShell>
  )
}

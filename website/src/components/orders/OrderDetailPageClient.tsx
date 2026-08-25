'use client'

import {OrderDetailBody} from '@/components/orders/OrderDetailBody'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {fetchMemberOrderDetail, type WebsiteOrderDetail} from '@/lib/orders/fetch-member-order-detail'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'
import detailStyles from './orderDetailPage.module.css'
import styles from './ordersPage.module.css'

type Props = {
  cartId: string
}

export function OrderDetailPageClient({cartId}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<WebsiteOrderDetail | null>(null)
  const [error, setError] = useState(false)

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

  if (loading) {
    return <WebsitePageLoading label="Chargement de la commande" />
  }

  return (
    <main className={styles.main}>
      <Link href="/profil/commandes" className={styles.back}>
        ← Mes commandes
      </Link>

      {error || !order ? (
        <p className={detailStyles.error}>Impossible de charger cette commande.</p>
      ) : (
        <>
          <header className={styles.header}>
            <h1 className={styles.title}>Commande {order.orderNumberCompact}</h1>
            <p className={styles.cardKind}>{order.orderTypeLabel}</p>
          </header>
          <OrderDetailBody order={order} />
        </>
      )}
    </main>
  )
}

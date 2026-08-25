'use client'

import {
  fetchMemberOrdersBundle,
  type MemberOrdersBundle,
  type WebsiteOrderCard,
} from '@/lib/orders/fetch-member-orders'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useEffect, useMemo, useState} from 'react'
import styles from './ordersPage.module.css'

type ViewTab = 'ongoing' | 'history' | 'returns'

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

function ReturnsEmptyState({onSeeOrders}: {onSeeOrders: () => void}) {
  return (
    <div className={styles.emptyReturns}>
      <p className={styles.emptyReturnsTitle}>Vous n’avez aucun retour en cours</p>
      <p className={styles.emptyReturnsLead}>
        Vous pouvez effectuer une demande de retour à partir du suivi de commandes
      </p>
      <button type="button" className={styles.emptyReturnsCta} onClick={onSeeOrders}>
        Voir mes commandes
      </button>
    </div>
  )
}

function OrderListCard({order}: {order: WebsiteOrderCard}) {
  return (
    <li className={styles.accordionItem}>
      <Link href={`/profil/commandes/${order.id}`} className={styles.card}>
        <div className={styles.cardTop}>
          <div>
            <p className={styles.cardTitle}>Commande {order.orderNumberCompact}</p>
            <p className={styles.cardKind}>{order.orderTypeLabel}</p>
          </div>
          <ChevronIcon />
        </div>
        <div className={styles.pillRow}>
          <span className={styles.pill}>
            {order.showPulse ? (
              <span className={`${styles.pillDot} ${styles.pillDotPulse}`} aria-hidden />
            ) : (
              <span className={styles.pillDot} aria-hidden />
            )}
            {order.statusLabel}
          </span>
        </div>
        {order.itemThumbUrls.length > 0 ? (
          <div className={styles.thumbs}>
            {order.itemThumbUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- URLs signées dynamiques
              <img key={`${order.id}-${i}`} src={url} alt="" className={styles.thumb} />
            ))}
          </div>
        ) : null}
      </Link>
    </li>
  )
}

export function OrdersPageClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [bundle, setBundle] = useState<MemberOrdersBundle | null>(null)
  const [tab, setTab] = useState<ViewTab>('ongoing')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: {user},
        } = await supabase.auth.getUser()
        if (!user) {
          router.replace(`/signin?next=${encodeURIComponent('/profil/commandes')}`)
          return
        }
        const data = await fetchMemberOrdersBundle(supabase, user.id)
        if (!cancelled) setBundle(data)
      } catch {
        if (!cancelled) router.replace(`/signin?next=${encodeURIComponent('/profil/commandes')}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const orders = useMemo(() => {
    if (!bundle) return []
    if (tab === 'returns') return bundle.returns
    if (tab === 'history') return bundle.history
    return bundle.ongoing
  }, [bundle, tab])

  const emptyMessage =
    tab === 'ongoing' ? 'Aucune commande en cours.' : 'Aucune commande dans l’historique.'

  if (loading || !bundle) {
    return <WebsitePageLoading label="Chargement des commandes" />
  }

  return (
    <main className={styles.main}>
      <Link href="/profil" className={styles.back}>
        ← Profil
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{tab === 'returns' ? 'Retours' : 'Commandes'}</h1>
      </header>

      <div className={styles.statusTabsThree} role="tablist" aria-label="Commandes et retours">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ongoing'}
          className={`${styles.tab} ${tab === 'ongoing' ? styles.tabActive : ''}`}
          onClick={() => setTab('ongoing')}
        >
          En cours
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setTab('history')}
        >
          Historique
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'returns'}
          className={`${styles.tab} ${tab === 'returns' ? styles.tabActive : ''}`}
          onClick={() => setTab('returns')}
        >
          Retours
        </button>
      </div>

      {orders.length > 0 ? (
        <ul className={styles.list}>
          {orders.map((order) => (
            <OrderListCard key={order.id} order={order} />
          ))}
        </ul>
      ) : tab === 'returns' ? (
        <ReturnsEmptyState onSeeOrders={() => setTab('ongoing')} />
      ) : (
        <p className={styles.empty}>{emptyMessage}</p>
      )}
    </main>
  )
}

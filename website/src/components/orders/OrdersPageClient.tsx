'use client'

import {
  fetchMemberOrdersBundle,
  type MemberOrdersBundle,
  type WebsiteOrderCard,
} from '@/lib/orders/fetch-member-orders'
import {setWebsiteOrderBadgeCount} from '@/lib/orders/website-order-badge'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {WEBSITE_LOCATION_PATH} from '@/lib/cart/paths'
import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useEffect, useMemo, useState} from 'react'
import cartStyles from '@/components/cart/cartPage.module.css'
import styles from './ordersPage.module.css'

type ViewTab = 'ongoing' | 'history'

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

function OrderListCard({order}: {order: WebsiteOrderCard}) {
  return (
    <li className={styles.accordionItem}>
      <Link href={`/profil/commandes/${order.id}`} className={styles.orderLink}>
        <div className={styles.cardTop}>
          <div>
            <p className={styles.orderTitle}>Commande {order.orderNumberCompact}</p>
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

function SegnaXPromoCard() {
  return (
    <Link
      href={WEBSITE_LOCATION_PATH}
      className={cartStyles.segnaCard}
      onClick={() => {
        trackWebsiteEvent('subscription_interest', {
          placement: 'orders_segnax_card',
          href: WEBSITE_LOCATION_PATH,
          plan_code: 'segna_x',
        })
      }}
    >
      <span className={cartStyles.segnaCardCopy}>
        <span className={cartStyles.segnaCardTitle}>
          Un accès premium et illimité
          <span className={cartStyles.segnaCardPrice}>20&nbsp;€ le 1er mois, puis 40&nbsp;€/mois</span>
        </span>
        <ul className={cartStyles.segnaCardBullets}>
          <li>Loue jusqu’à 400&nbsp;€ de pièces par mois</li>
          <li>Frais d’expédition inclus</li>
          <li>20&nbsp;% de réduction du prix d’achat sur tout le catalogue</li>
        </ul>
      </span>
      <span className={cartStyles.segnaCardMedia}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/segnax-cart-promo.png"
          alt=""
          className={cartStyles.segnaCardBg}
          aria-hidden
        />
        <span className={cartStyles.segnaCardCta}>
          <span>Découvrir</span>
          <strong>SegnaX</strong>
        </span>
      </span>
    </Link>
  )
}

function AppOrdersPromo() {
  const href = `${SEGNA_APP_BASE_URL}/exchange`
  return (
    <a
      href={href}
      className={cartStyles.appPromo}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        trackWebsiteEvent('cta_clicked', {
          cta_label: 'Découvrir Segna sur l’app',
          cta_href: href,
          placement: 'orders_app_promo',
        })
        trackWebsiteEvent('app_open_intent', {
          destination: 'app_store',
          href,
          placement: 'orders_app_promo',
        })
      }}
    >
      <p className={cartStyles.appPromoTitle}>Découvrir Segna sur l’app</p>
      <p className={cartStyles.appPromoSubtitle}>
        Suis tes commandes en direct et les livraisons — notifications incluses.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/app-store-badge.png"
        alt="Download on the App Store"
        className={cartStyles.appPromoBadge}
        width={180}
        height={52}
        decoding="async"
      />
    </a>
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
        if (!cancelled) {
          setBundle(data)
          setWebsiteOrderBadgeCount(data.ongoing.length)
        }
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
    return tab === 'history' ? bundle.history : bundle.ongoing
  }, [bundle, tab])

  const ongoingCount = bundle?.ongoing.length ?? 0
  const historyCount = bundle?.history.length ?? 0

  const emptyMessage =
    tab === 'ongoing' ? 'Aucune commande en cours.' : 'Aucune commande dans l’historique.'

  if (loading || !bundle) {
    return <WebsitePageLoading label="Chargement des commandes" />
  }

  const ordersPanel = (
    <section className={styles.panelCard} aria-labelledby="orders-heading">
      <div className={styles.panelHeader}>
        <Link href="/profil" className={styles.back}>
          ← Profil
        </Link>
        <h1 id="orders-heading" className={styles.title}>
          Commandes
        </h1>
      </div>

      <div className={styles.statusTabsTwo} role="tablist" aria-label="Commandes">
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
      </div>

      {orders.length > 0 ? (
        <ul className={styles.list}>
          {orders.map((order) => (
            <OrderListCard key={order.id} order={order} />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{emptyMessage}</p>
      )}
    </section>
  )

  return (
    <main className={styles.main}>
      <div className={styles.layout}>
        <div className={styles.leftCol}>
          {ordersPanel}
          <div className={styles.desktopOnly}>
            <SegnaXPromoCard />
          </div>
        </div>

        <aside className={`${styles.rightCol} ${styles.desktopOnly}`} aria-label="Aide commandes">
          <div className={styles.rightSticky}>
            <section className={styles.panelCard} aria-labelledby="orders-summary-heading">
              <h2 id="orders-summary-heading" className={styles.summaryTitle}>
                Suivi de tes commandes
              </h2>
              <dl className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <dt>En cours</dt>
                  <dd>{ongoingCount}</dd>
                </div>
                <div className={styles.summaryRow}>
                  <dt>Historique</dt>
                  <dd>{historyCount}</dd>
                </div>
              </dl>
              <p className={styles.summaryLead}>
                Ouvre une commande pour voir la livraison, le suivi transporteur et ta facture.
              </p>
              <Link href="/catalogue" className={styles.catalogueLink}>
                Continuer vos achats
              </Link>
            </section>

            <AppOrdersPromo />
          </div>
        </aside>
      </div>
    </main>
  )
}

'use client'

import {buildAppHandoffUrl} from '@/lib/auth/build-app-handoff-url'
import {hasActivePaidSubscription} from '@/lib/auth/has-active-subscription'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {WEBSITE_LOCATION_PATH} from '@/lib/cart/paths'
import {
  openIosAppOrAppStore,
  SEGNA_APP_BASE_URL,
  SEGNA_APP_STORE_URL,
} from '@/lib/catalog/catalog-app-links'
import type {WebsiteOrderDetail} from '@/lib/orders/fetch-member-order-detail'
import {
  shipmentProgressActiveStepIndex,
  shipmentProgressSteps,
} from '@/lib/orders/shipment-progress'
import {detectClientPlatform} from '@/lib/platform/client-platform'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {WaveDotsLoader} from '@/components/ui/WaveDotsLoader'
import Link from 'next/link'
import {useCallback, useEffect, useState} from 'react'
import cartStyles from '@/components/cart/cartPage.module.css'
import styles from './orderDetailPage.module.css'

function formatOrderDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

function StatusCheckIcon() {
  return (
    <svg className={styles.statusIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 12.2 10.6 14.8 16.2 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7h11v10H3V7Zm11 3h4l3 3v4h-7v-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="18.5" r="1.5" fill="currentColor" />
      <circle cx="17.5" cy="18.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ShipmentProgressBlock({order}: {order: WebsiteOrderDetail}) {
  const progress = order.shipmentProgress
  if (!progress) return null

  const steps = shipmentProgressSteps(progress.deliveryKind)
  const activeIndex = shipmentProgressActiveStepIndex(progress.status, progress.deliveryKind)
  const completedCount = activeIndex == null ? steps.length : activeIndex

  return (
    <section className={styles.progressBlock} aria-label="Suivi de livraison">
      <h2 className={styles.progressTitle}>{progress.title}</h2>
      <p className={styles.progressEstimate}>{progress.scheduleLabel}</p>
      {progress.showProgress ? (
        <div
          className={styles.progressBars}
          aria-label={
            activeIndex == null
              ? 'Progression terminée'
              : `Étape ${activeIndex + 1} sur ${steps.length}`
          }
        >
          {steps.map((step, index) => {
            const done = index < completedCount
            const active = activeIndex != null && index === activeIndex
            return (
              <div
                key={step.key}
                className={`${styles.progressBar} ${done ? styles.progressBarDone : ''} ${
                  active ? styles.progressBarActive : ''
                }`}
                style={{flex: step.weight}}
              />
            )
          })}
        </div>
      ) : null}
      <p className={styles.progressDetail}>{progress.detailLine}</p>
      {progress.trackingNumber && !progress.trackingHref ? (
        <p className={styles.trackingRef}>N° {progress.trackingNumber}</p>
      ) : null}
      {progress.trackingHref ? (
        <a
          className={styles.trackBtn}
          href={progress.trackingHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {progress.trackingLabel}
        </a>
      ) : null}
    </section>
  )
}

function SegnaXPromoCard() {
  return (
    <Link
      href={WEBSITE_LOCATION_PATH}
      className={cartStyles.segnaCard}
      onClick={() => {
        trackWebsiteEvent('subscription_interest', {
          placement: 'order_detail_segnax_card',
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

function FeesCard({order}: {order: WebsiteOrderDetail}) {
  const articleCount = order.lines.length
  return (
    <section className={styles.sideCard} aria-labelledby={`order-fees-${order.cartId}`}>
      <h2 id={`order-fees-${order.cartId}`} className={styles.sideCardTitle}>
        Frais facturés
      </h2>
      <dl className={styles.feesRows}>
        <div className={styles.feesRow}>
          <dt>
            Sous-total{' '}
            <span className={styles.feesDetail}>
              ({articleCount} pièce{articleCount > 1 ? 's' : ''})
            </span>
          </dt>
          <dd>{formatEuro(order.itemsSubtotalCents)}</dd>
        </div>
        {order.shippingCents != null ? (
          <div className={styles.feesRow}>
            <dt>Livraison</dt>
            <dd>{order.shippingCents === 0 ? 'Offerte' : formatEuro(order.shippingCents)}</dd>
          </div>
        ) : null}
        {order.totalCents != null ? (
          <div className={`${styles.feesRow} ${styles.feesTotal}`}>
            <dt>Total</dt>
            <dd>{formatEuro(order.totalCents)}</dd>
          </div>
        ) : null}
      </dl>
      {order.invoiceUrl ? (
        <a
          className={styles.invoiceBtn}
          href={order.invoiceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Voir ma facture
        </a>
      ) : (
        <p className={styles.feesHint}>La facture sera disponible dès que le paiement aura été finalisé.</p>
      )}
    </section>
  )
}

function DeliveryCard({order}: {order: WebsiteOrderDetail}) {
  const address = order.address
  const progress = order.shipmentProgress
  const trackingNumber = progress?.trackingNumber?.trim() || null
  const trackingHref = progress?.trackingHref?.trim() || null
  const addressTitle =
    address?.kind === 'relay'
      ? 'Point de livraison'
      : address?.kind === 'home'
        ? 'Adresse de livraison'
        : 'Détails de la livraison'

  return (
    <section className={styles.sideCard} aria-labelledby={`order-delivery-${order.cartId}`}>
      <h2 id={`order-delivery-${order.cartId}`} className={styles.sideCardTitle}>
        Détails de la livraison
      </h2>
      <ul className={styles.perkList}>
        <li className={styles.perkItem}>
          <span className={styles.perkIcon} aria-hidden>
            <TruckIcon />
          </span>
          <div className={styles.perkBody}>
            <strong className={styles.perkTitle}>
              {order.address?.methodTitle?.trim() || order.orderTypeLabel}
            </strong>
            <span className={styles.perkText}>
              {progress?.scheduleLabel || progress?.detailLine || order.statusLabel}
            </span>
            {trackingNumber ? (
              trackingHref ? (
                <a
                  className={styles.trackingLink}
                  href={trackingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  N° {trackingNumber}
                </a>
              ) : (
                <span className={styles.trackingPlain}>N° {trackingNumber}</span>
              )
            ) : null}
          </div>
        </li>
        {address ? (
          <li className={styles.perkItem}>
            <span className={styles.perkIcon} aria-hidden>
              <PinIcon />
            </span>
            <div className={styles.perkBody}>
              <strong className={styles.perkTitle}>{addressTitle}</strong>
              <span className={styles.perkText}>
                {address.fullName}
                <br />
                {address.street}
                <br />
                {address.cityLine}
                {address.phone !== '—' ? (
                  <>
                    <br />
                    {address.phone}
                  </>
                ) : null}
              </span>
            </div>
          </li>
        ) : (
          <li className={styles.perkItem}>
            <span className={styles.perkIcon} aria-hidden>
              <PinIcon />
            </span>
            <div className={styles.perkBody}>
              <strong className={styles.perkTitle}>{addressTitle}</strong>
              <span className={styles.perkText}>Adresse en cours de confirmation.</span>
            </div>
          </li>
        )}
      </ul>
    </section>
  )
}

function AppManagePromo({order}: {order: WebsiteOrderDetail}) {
  const href = `${SEGNA_APP_BASE_URL}${order.appDetailPath}`
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
          placement: 'order_detail_app_promo',
        })
        trackWebsiteEvent('app_open_intent', {
          destination: 'app_store',
          href,
          placement: 'order_detail_app_promo',
        })
      }}
    >
      <p className={cartStyles.appPromoTitle}>Découvrir Segna sur l’app</p>
      <p className={cartStyles.appPromoSubtitle}>
        Télécharge l’app pour gérer ta commande, le suivi et les notifications.
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

function PurchaseDetail({order}: {order: WebsiteOrderDetail}) {
  const [showSegnaX, setShowSegnaX] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const subscribed = await hasActivePaidSubscription(supabase)
        if (!cancelled) setShowSegnaX(!subscribed)
      } catch {
        if (!cancelled) setShowSegnaX(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className={styles.detailLayout}>
      <div className={styles.leftCol}>
        <div className={styles.metaRow}>
          <div>
            <p className={styles.metaLabel}>Date de commande</p>
            <p className={styles.metaValue}>{formatOrderDate(order.createdAtIso)}</p>
          </div>
          <div>
            <p className={styles.metaLabel}>Numéro de commande</p>
            <p className={styles.metaValue}>{order.orderNumberCompact}</p>
          </div>
        </div>

        <ShipmentProgressBlock order={order} />

        {!order.shipmentProgress ? (
          <div className={styles.statusBlock}>
            <StatusCheckIcon />
            <p className={styles.statusLabel}>{order.statusLabel}</p>
          </div>
        ) : null}

        {order.lines.map((line) => (
          <article key={line.id} className={styles.line}>
            {line.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL signée dynamique
              <img src={line.photoUrl} alt="" className={styles.linePhoto} />
            ) : (
              <div className={styles.linePhoto} aria-hidden />
            )}
            <div>
              {line.brand ? <p className={styles.lineBrand}>{line.brand}</p> : null}
              <p className={styles.lineTitle}>{line.title}</p>
              {line.sizeLabel ? <p className={styles.lineMeta}>Taille {line.sizeLabel}</p> : null}
              <p className={styles.lineMeta}>Quantité 1</p>
              <p className={styles.linePrice}>{formatEuro(line.priceCents)}</p>
            </div>
          </article>
        ))}

        {order.timeline.length > 0 ? (
          <section className={styles.section} aria-labelledby={`order-timeline-${order.cartId}`}>
            <h2 id={`order-timeline-${order.cartId}`} className={styles.sectionTitle}>
              Suivi de la commande
            </h2>
            <ol className={styles.timeline}>
              {order.timeline.map((entry, i) => (
                <li key={`${entry.timeLabel}-${entry.label}-${i}`} className={styles.timelineItem}>
                  <span className={styles.timelineTime}>{entry.timeLabel}</span>
                  <span className={styles.timelineLabel}>{entry.label}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {showSegnaX ? (
          <div className={styles.segnaWrap}>
            <SegnaXPromoCard />
          </div>
        ) : null}

        {/* Mobile : frais + livraison + app sous le contenu */}
        <div className={styles.mobileSideStack}>
          <FeesCard order={order} />
          <DeliveryCard order={order} />
          <AppManagePromo order={order} />
        </div>
      </div>

      <aside className={styles.rightCol} aria-label="Récapitulatif commande">
        <div className={styles.rightSticky}>
          <FeesCard order={order} />
          <DeliveryCard order={order} />
          <AppManagePromo order={order} />
        </div>
      </aside>
    </div>
  )
}

function LocationGate({order}: {order: WebsiteOrderDetail}) {
  const [pending, setPending] = useState(false)

  const openApp = useCallback(
    async (preferIosStore: boolean) => {
      if (pending) return
      setPending(true)
      try {
        const appUrl = await buildAppHandoffUrl(order.appDetailPath)
        if (preferIosStore && detectClientPlatform() === 'ios') {
          openIosAppOrAppStore(appUrl, SEGNA_APP_STORE_URL)
          return
        }
        window.location.assign(appUrl)
      } catch {
        window.location.assign(await buildAppHandoffUrl(order.appDetailPath))
      } finally {
        setPending(false)
      }
    },
    [order.appDetailPath, pending],
  )

  return (
    <>
      <div className={styles.metaRow}>
        <div>
          <p className={styles.metaLabel}>Date de commande</p>
          <p className={styles.metaValue}>{formatOrderDate(order.createdAtIso)}</p>
        </div>
        <div>
          <p className={styles.metaLabel}>Numéro de commande</p>
          <p className={styles.metaValue}>{order.orderNumberCompact}</p>
        </div>
      </div>

      <ShipmentProgressBlock order={order} />

      {!order.shipmentProgress ? (
        <div className={styles.statusBlock}>
          <StatusCheckIcon />
          <p className={styles.statusLabel}>{order.statusLabel}</p>
        </div>
      ) : null}

      <div className={styles.locationCard}>
        <p className={styles.locationLead}>
          Le suivi de ta location ({order.orderTypeLabel.toLowerCase()}) se poursuit dans l’app Segna —
          emprunt et notifications.
        </p>
        <button type="button" className={styles.primaryBtn} disabled={pending} onClick={() => void openApp(true)}>
          {pending ? <WaveDotsLoader /> : 'Ouvrir dans l’app iOS'}
        </button>
        <button
          type="button"
          className={styles.secondaryLink}
          disabled={pending}
          onClick={() => void openApp(false)}
        >
          Continuer sans l’app
        </button>
      </div>
    </>
  )
}

/** Corps détail commande (achat complet ou gate location) — pour page dédiée. */
export function OrderDetailBody({order}: {order: WebsiteOrderDetail}) {
  if (order.orderKind === 'achat') {
    return <PurchaseDetail order={order} />
  }
  return <LocationGate order={order} />
}

'use client'

import {buildAppHandoffUrl} from '@/lib/auth/build-app-handoff-url'
import {
  openIosAppOrAppStore,
  SEGNA_APP_STORE_URL,
} from '@/lib/catalog/catalog-app-links'
import type {WebsiteOrderDetail} from '@/lib/orders/fetch-member-order-detail'
import {
  shipmentProgressActiveStepIndex,
  shipmentProgressSteps,
} from '@/lib/orders/shipment-progress'
import {detectClientPlatform} from '@/lib/platform/client-platform'
import {useCallback, useState} from 'react'
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

function PackageIcon() {
  return (
    <svg className={styles.shipIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 12 20 7.5M12 12 4 7.5M12 12v9" stroke="currentColor" strokeWidth="1.5" />
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

function PurchaseDetail({order}: {order: WebsiteOrderDetail}) {
  const articleCount = order.lines.length
  const addressTitle =
    order.address?.kind === 'relay'
      ? 'Point de livraison'
      : order.address?.kind === 'home'
        ? 'Adresse de livraison'
        : 'Adresse de livraison'

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

      <div className={styles.shipBox}>
        <PackageIcon />
        <p className={styles.shipText}>
          <strong>{order.orderTypeLabel}</strong>
          {' — '}
          {articleCount} article{articleCount > 1 ? 's' : ''}
          {order.address?.methodTitle ? (
            <>
              <br />
              <span className={styles.shipMethod}>{order.address.methodTitle}</span>
            </>
          ) : null}
        </p>
      </div>

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

      {order.address ? (
        <section className={styles.section} aria-labelledby={`order-address-${order.cartId}`}>
          <h2 id={`order-address-${order.cartId}`} className={styles.sectionTitle}>
            {addressTitle}
          </h2>
          {order.address.kind === 'profile' ? (
            <p className={styles.sectionHint}>
              Si besoin, il vous est possible de changer l’adresse de livraison de votre commande avant
              qu’elle ne soit en cours de préparation.
            </p>
          ) : null}
          <address className={styles.addressBlock}>
            {order.address.fullName}
            <br />
            {order.address.street}
            <br />
            {order.address.cityLine}
            <br />
            {order.address.phone !== '—' ? (
              <>
                {order.address.phone}
                <br />
              </>
            ) : null}
            {order.address.country}
          </address>
        </section>
      ) : null}

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

      <section className={styles.section} aria-label="Récapitulatif">
        <p className={styles.summaryRow}>
          <span>Nombre d’articles</span>
          <span>
            {articleCount} article{articleCount > 1 ? 's' : ''}
          </span>
        </p>
        <p className={styles.summaryRow}>
          <span>Montant total des articles</span>
          <span>{formatEuro(order.itemsSubtotalCents)}</span>
        </p>
        {order.shippingCents != null ? (
          <p className={styles.summaryRow}>
            <span>Livraison</span>
            <span>
              {order.shippingCents === 0 ? 'Offerte' : formatEuro(order.shippingCents)}
            </span>
          </p>
        ) : null}
        {order.totalCents != null ? (
          <p className={styles.totalRow}>
            <span>Total</span>
            <span>EUR {formatEuro(order.totalCents)}</span>
          </p>
        ) : null}
        {order.invoiceUrl ? (
          <a className={styles.invoiceLink} href={order.invoiceUrl} target="_blank" rel="noopener noreferrer">
            Obtenir ma facture
          </a>
        ) : (
          <p className={styles.sectionHint} style={{marginTop: '1rem', marginBottom: 0}}>
            La facture sera disponible dès que le paiement aura été finalisé.
          </p>
        )}
      </section>
    </>
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
          emprunt, retours et notifications.
        </p>
        <button type="button" className={styles.primaryBtn} disabled={pending} onClick={() => void openApp(true)}>
          Ouvrir dans l’app iOS
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

'use client'

import Link from 'next/link'
import {useEffect, useMemo} from 'react'
import {createPortal} from 'react-dom'
import {
  catalogPurchasePriceCents,
  formatCatalogPurchasePriceLabel,
} from '@/lib/catalog/catalog-borrow-price-label'
import {formatCatalogCardSizeLabel} from '@/lib/catalog/format-catalog-card-size'
import {catalogItemPagePath} from '@/lib/catalog/catalog-app-links'
import {WEBSITE_CHECKOUT_PATH, WEBSITE_LOCATION_PATH} from '@/lib/cart/paths'
import {
  WEBSITE_DEFAULT_SHIPPING_LABEL,
  WEBSITE_PURCHASE_FREE_SHIPPING_THRESHOLD_CENTS,
  websiteChronopostHomeOutboundTtcCents,
} from '@/lib/cart/website-cart-shipping'
import {useWebsiteCart} from '@/lib/cart/use-website-cart'
import styles from './addToCartModal.module.css'

type Props = {
  open: boolean
  onClose: () => void
  onContinueShopping: () => void
}

function formatEuroSummary(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

export function AddToCartModal({open, onClose, onContinueShopping: _onContinueShopping}: Props) {
  const {items, count, removeItem} = useWebsiteCart()

  const subtotalCents = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (typeof item.price_points !== 'number' || !Number.isFinite(item.price_points)) return sum
        return sum + catalogPurchasePriceCents(item.price_points)
      }, 0),
    [items],
  )

  const freeShippingUnlocked = subtotalCents >= WEBSITE_PURCHASE_FREE_SHIPPING_THRESHOLD_CENTS
  const shippingTtcCents = freeShippingUnlocked
    ? 0
    : websiteChronopostHomeOutboundTtcCents(Math.max(count, 1))
  const totalCents = subtotalCents + shippingTtcCents

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.root} role="presentation">
      <button type="button" className={styles.scrim} aria-label="Fermer le panier" onClick={onClose} />
      <div
        className={styles.drawer}
        role="dialog"
        aria-modal
        aria-labelledby="cart-drawer-title"
      >
        <header className={styles.drawerHeader}>
          <div className={styles.drawerHeading}>
            <h2 id="cart-drawer-title" className={styles.drawerTitle}>
              Panier
            </h2>
            <span className={styles.countBadge}>{count}</span>
          </div>
          <button type="button" className={styles.close} aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className={styles.drawerBody}>
          <section className={styles.itemsCol} aria-label="Articles du panier">
            <ul className={styles.list}>
              {items.map((item) => {
                const sizeLine = formatCatalogCardSizeLabel(item.size_label, item.size_code)
                return (
                  <li key={item.id} className={styles.row}>
                    <Link
                      href={catalogItemPagePath(item.id)}
                      className={styles.thumbLink}
                      onClick={onClose}
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className={styles.thumb} />
                      ) : (
                        <span className={styles.thumbFallback} aria-hidden />
                      )}
                    </Link>
                    <div className={styles.meta}>
                      {item.brand_label ? <p className={styles.brand}>{item.brand_label}</p> : null}
                      <Link
                        href={catalogItemPagePath(item.id)}
                        className={styles.itemTitle}
                        onClick={onClose}
                      >
                        {item.title}
                      </Link>
                      {sizeLine ? <p className={styles.size}>{sizeLine}</p> : null}
                      <button
                        type="button"
                        className={styles.remove}
                        onClick={() => removeItem(item.id)}
                        aria-label={`Retirer ${item.title}`}
                      >
                        Retirer
                      </button>
                    </div>
                    <p className={styles.rowPrice}>
                      {formatCatalogPurchasePriceLabel(item.price_points)}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>

          <aside className={styles.summaryCol} aria-label="Récapitulatif">
            <dl className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <dt>Sous-total</dt>
                <dd>{formatEuroSummary(subtotalCents)}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>{WEBSITE_DEFAULT_SHIPPING_LABEL}</dt>
                <dd className={freeShippingUnlocked ? styles.summaryMuted : undefined}>
                  {freeShippingUnlocked ? 'Offerte' : formatEuroSummary(shippingTtcCents)}
                </dd>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <dt>Total</dt>
                <dd>{formatEuroSummary(totalCents)}</dd>
              </div>
            </dl>

            <div className={styles.ctaStack}>
              <Link
                href={`${WEBSITE_CHECKOUT_PATH}?mode=purchase`}
                className={styles.primary}
                onClick={onClose}
              >
                Finaliser mon achat
              </Link>
              <div className={styles.segnaCtaBlock}>
                <Link href={WEBSITE_LOCATION_PATH} className={styles.segnaCta} onClick={onClose}>
                  Profite de 20&nbsp;% de réduction*
                </Link>
                <p className={styles.segnaCtaNote}>
                  *Sur le prix d’achat du catalogue avec un abonnement SegnaX.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  )
}

'use client'

import Link from 'next/link'
import {formatCatalogPurchasePriceLabel} from '@/lib/catalog/catalog-borrow-price-label'
import {formatCatalogCardSizeLabel} from '@/lib/catalog/format-catalog-card-size'
import {catalogItemPagePath} from '@/lib/catalog/catalog-app-links'
import {WEBSITE_CHECKOUT_PATH, WEBSITE_SUBSCRIPTION_PATH} from '@/lib/cart/paths'
import {useWebsiteCart} from '@/lib/cart/use-website-cart'
import styles from './cartPage.module.css'

export function CartPageClient() {
  const {items, count, removeItem} = useWebsiteCart()

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Panier</p>
        <h1 className={styles.title}>
          {count === 0 ? 'Ton panier est vide' : `${count} pièce${count > 1 ? 's' : ''}`}
        </h1>
        <p className={styles.lead}>
          {count === 0
            ? 'Parcours le catalogue et ajoute les pièces qui te plaisent.'
            : 'Choisis comment tu veux continuer : abonnement SegnaX, location ponctuelle ou achat.'}
        </p>
      </header>

      {count === 0 ? (
        <div className={styles.emptyActions}>
          <Link href="/catalogue" className={styles.primaryBtn}>
            Voir le catalogue
          </Link>
          <Link href={WEBSITE_SUBSCRIPTION_PATH} className={styles.secondaryBtn}>
            Découvrir SegnaX
          </Link>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((item) => {
              const sizeLine = formatCatalogCardSizeLabel(item.size_label, item.size_code)
              return (
                <li key={item.id} className={styles.row}>
                  <Link href={catalogItemPagePath(item.id)} className={styles.thumbLink}>
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className={styles.thumb} />
                    ) : (
                      <span className={styles.thumbFallback} aria-hidden />
                    )}
                  </Link>
                  <div className={styles.meta}>
                    {item.brand_label ? <p className={styles.brand}>{item.brand_label}</p> : null}
                    <Link href={catalogItemPagePath(item.id)} className={styles.itemTitle}>
                      {item.title}
                    </Link>
                    {sizeLine ? <p className={styles.size}>{sizeLine}</p> : null}
                    <p className={styles.price}>{formatCatalogPurchasePriceLabel(item.price_points)}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => removeItem(item.id)}
                    aria-label={`Retirer ${item.title}`}
                  >
                    Retirer
                  </button>
                </li>
              )
            })}
          </ul>

          <section className={styles.checkoutBlock} aria-labelledby="cart-next-steps">
            <h2 id="cart-next-steps" className={styles.checkoutHeading}>
              Et maintenant ?
            </h2>
            <p className={styles.checkoutLead}>
              L&apos;abonnement SegnaX est le plus avantageux. Tu peux aussi louer ponctuellement ou acheter.
            </p>

            <div className={styles.ctaStack}>
              <Link
                href={WEBSITE_SUBSCRIPTION_PATH}
                className={styles.primaryBtn}
                aria-label="Louer 1 mois avec SegnaX"
              >
                <span className={styles.ctaWithLogo}>
                  <span>Louer 1 mois avec</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/segnaX_logo_mark_blanc.png"
                    alt="segnaX"
                    className={styles.ctaSegnaX}
                    width={96}
                    height={28}
                    decoding="async"
                  />
                </span>
                <span className={styles.ctaHint}>puis 39,99&nbsp;€/mois</span>
              </Link>
              <Link
                href={`${WEBSITE_CHECKOUT_PATH}?mode=rental`}
                className={styles.secondaryBtn}
              >
                Louer ponctuellement
              </Link>
              <Link
                href={`${WEBSITE_CHECKOUT_PATH}?mode=purchase`}
                className={styles.secondaryBtn}
              >
                Acheter
              </Link>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

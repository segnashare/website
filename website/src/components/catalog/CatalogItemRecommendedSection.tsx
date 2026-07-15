import {CatalogGridCardMedia} from '@/components/catalog/CatalogGridCardMedia'
import {catalogItemPagePath, SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {formatCatalogPurchasePriceShort} from '@/lib/catalog/catalog-borrow-price-label'
import {formatCatalogCardSizeLabel} from '@/lib/catalog/format-catalog-card-size'
import type {MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'
import Link from 'next/link'
import styles from './catalogItemRecommendedSection.module.css'

type Props = {
  items: MarketingCatalogGridItem[]
}

export function CatalogItemRecommendedSection({items}: Props) {
  if (items.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="catalog-piece-recommended-heading">
      <div className={styles.titleInner}>
        <h3 id="catalog-piece-recommended-heading" className={styles.heading}>
          Recommandées
        </h3>
      </div>
      <ul className={styles.grid}>
        {items.map((item) => {
          const titleLine = item.displayTitle ?? item.title
          const sizeLine = formatCatalogCardSizeLabel(item.size_label, item.size_code)
          return (
            <li key={item.id} className={styles.card}>
              <Link href={catalogItemPagePath(item.id)} className={styles.cardLink} aria-label={`Voir ${titleLine}`}>
                <div className={styles.media}>
                  <CatalogGridCardMedia item={item} />
                </div>
                <div className={styles.body}>
                  <span className={styles.title}>{titleLine}</span>
                  <div className={styles.meta}>
                    <span className={styles.size}>{sizeLine}</span>
                    {item.isSold ? null : (
                      <span className={styles.price}>{formatCatalogPurchasePriceShort(item.price_points)}</span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
      <div className={styles.ctas}>
        <Link href="/catalogue" className={styles.ctaSecondary}>
          Explorez le catalogue
        </Link>
        <a href={SEGNA_APP_BASE_URL} className={styles.ctaPrimary}>
          1er mois Segna gratuit
        </a>
      </div>
    </section>
  )
}

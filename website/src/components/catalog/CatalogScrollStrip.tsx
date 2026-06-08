'use client'

import Link from 'next/link'
import posthog from 'posthog-js'
import {CatalogGridCardMedia} from '@/components/catalog/CatalogGridCardMedia'
import {CatalogPuzzleIntroFit} from '@/components/page-sections/CatalogPuzzleIntroFit'
import scrollStyles from '@/components/page-sections/horizontalScrollCards.module.css'
import {formatCatalogBorrowPriceLabel} from '@/lib/catalog/catalog-borrow-price-label'
import type {ScrollCardSize} from '@/lib/catalog/scroll-card-size'
import {normalizeScrollCardSize} from '@/lib/catalog/scroll-card-size'
import type {MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'
import styles from './catalogScrollStrip.module.css'

type Props = {
  items: MarketingCatalogGridItem[]
  heading?: string
  intro?: string
  introCtaLabel?: string
  introCtaHref?: string
  cardSize?: ScrollCardSize
  sectionKey?: string
}

function CatalogScrollCard({item}: {item: MarketingCatalogGridItem}) {
  const titleLine = item.displayTitle ?? item.title
  const metaLine = item.displaySubtitle?.trim() || item.brand_label || item.category_label || null

  return (
    <Link
      href={`/catalogue/piece/${item.id}`}
      className={`${scrollStyles.slideLink} ${scrollStyles.slide} ${scrollStyles.slideSquare}`}
      onClick={() =>
        posthog.capture('catalog_item_clicked', {
          item_id: item.id,
          item_title: item.title,
          brand: item.brand_label,
          category: item.category_label,
          price_points: item.price_points,
          source: 'catalog_scroll_strip',
        })
      }
    >
      <div className={styles.catalogCard}>
        <div className={styles.catalogCardMedia}>
          <CatalogGridCardMedia item={item} />
        </div>
        <div className={styles.catalogCardBody}>
          <span className={styles.catalogCardTitle}>{titleLine}</span>
          {metaLine ? <span className={styles.catalogCardMeta}>{metaLine}</span> : null}
          <span className={styles.catalogCardPrice}>{formatCatalogBorrowPriceLabel(item.price_points)}</span>
        </div>
      </div>
    </Link>
  )
}

export function CatalogScrollStrip({
  items,
  heading,
  intro,
  introCtaLabel,
  introCtaHref,
  cardSize,
  sectionKey,
}: Props) {
  if (items.length === 0) return null

  const size = normalizeScrollCardSize(cardSize)
  const showIntro = Boolean(heading?.trim() || intro?.trim() || (introCtaLabel && introCtaHref))

  return (
    <section
      className={styles.section}
      aria-labelledby={heading?.trim() ? `catalog-scroll-${sectionKey ?? 'strip'}` : undefined}
    >
      {showIntro ? (
        <header className={styles.introWrap}>
          <CatalogPuzzleIntroFit
            heading={heading?.trim() || undefined}
            lead={intro?.trim() || undefined}
            introCtaLabel={introCtaLabel}
            introCtaHref={introCtaHref}
          />
        </header>
      ) : null}

      <div className={`${scrollStyles.fullBleed} ${styles.scrollBleed}`}>
        <div className={scrollStyles.scrollBlock} data-card-size={size}>
          <div className={scrollStyles.scrollViewport}>
            <div className={scrollStyles.track}>
              <div className={scrollStyles.trackRow}>
                {items.map((item) => (
                  <CatalogScrollCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

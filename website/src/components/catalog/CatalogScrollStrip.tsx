'use client'

import {CatalogGridCardMedia} from '@/components/catalog/CatalogGridCardMedia'
import {CatalogItemDetailModal} from '@/components/catalog/CatalogItemDetailModal'
import {CatalogPuzzleIntroFit} from '@/components/page-sections/CatalogPuzzleIntroFit'
import scrollStyles from '@/components/page-sections/horizontalScrollCards.module.css'
import {formatCatalogBorrowPriceLabel} from '@/lib/catalog/catalog-borrow-price-label'
import {prefetchCatalogItemDetailClient} from '@/lib/catalog/catalog-item-detail-client-fetch'
import type {ScrollCardSize} from '@/lib/catalog/scroll-card-size'
import {normalizeScrollCardSize} from '@/lib/catalog/scroll-card-size'
import type {MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'
import {useState} from 'react'
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

function CatalogScrollCard({item, onOpen}: {item: MarketingCatalogGridItem; onOpen: (itemId: string) => void}) {
  const titleLine = item.displayTitle ?? item.title
  const metaLine = item.displaySubtitle?.trim() || item.brand_label || item.category_label || null

  return (
    <article className={`${scrollStyles.slide} ${scrollStyles.slideSquare}`}>
      <button
        type="button"
        className={`${styles.catalogCard} ${styles.catalogCardButton}`}
        aria-label={`Voir ${titleLine}`}
        onClick={() => onOpen(item.id)}
        onMouseEnter={() => prefetchCatalogItemDetailClient(item.id)}
        onFocus={() => prefetchCatalogItemDetailClient(item.id)}
      >
        <div className={styles.catalogCardMedia}>
          <CatalogGridCardMedia item={item} />
        </div>
        <div className={styles.catalogCardBody}>
          <span className={styles.catalogCardTitle}>{titleLine}</span>
          {metaLine ? <span className={styles.catalogCardMeta}>{metaLine}</span> : null}
          <span className={styles.catalogCardPrice}>{formatCatalogBorrowPriceLabel(item.price_points)}</span>
        </div>
      </button>
    </article>
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
  const [openItemId, setOpenItemId] = useState<string | null>(null)

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
                  <CatalogScrollCard key={item.id} item={item} onOpen={setOpenItemId} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CatalogItemDetailModal itemId={openItemId} onClose={() => setOpenItemId(null)} />
    </section>
  )
}

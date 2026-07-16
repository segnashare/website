'use client'

import {CatalogGridCardMedia} from '@/components/catalog/CatalogGridCardMedia'
import {CatalogItemDetailModal} from '@/components/catalog/CatalogItemDetailModal'
import {CatalogPuzzleIntroFit} from '@/components/page-sections/CatalogPuzzleIntroFit'
import scrollStyles from '@/components/page-sections/horizontalScrollCards.module.css'
import {formatCatalogPurchasePriceShort} from '@/lib/catalog/catalog-borrow-price-label'
import {formatCatalogCardSizeLabel} from '@/lib/catalog/format-catalog-card-size'
import {prefetchCatalogItemDetailClient} from '@/lib/catalog/catalog-item-detail-client-fetch'
import {isMarketingCatalogItemAvailable} from '@/lib/catalog/catalog-sold-sort'
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
  const sizeLine = formatCatalogCardSizeLabel(item.size_label, item.size_code)
  const available = isMarketingCatalogItemAvailable(item.status)

  return (
    <article className={`${scrollStyles.slide} ${scrollStyles.slidePortrait}`}>
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
          <div className={styles.catalogCardTitleRow}>
            <span className={styles.catalogCardTitle}>{titleLine}</span>
            <span
              className={`${styles.catalogCardAvailDot} ${available ? styles.catalogCardAvailDotAvailable : styles.catalogCardAvailDotUnavailable}`}
              title={available ? 'Disponible' : 'Indisponible'}
              aria-label={available ? 'Disponible' : 'Indisponible'}
              role="img"
            />
          </div>
          <div className={styles.catalogCardMetaRow}>
            <span className={styles.catalogCardSize}>{sizeLine}</span>
            {item.isSold ? null : (
              <span className={styles.catalogCardPrice}>
                {formatCatalogPurchasePriceShort(item.price_points)}
              </span>
            )}
          </div>
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

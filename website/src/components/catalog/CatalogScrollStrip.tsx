'use client'

import {CatalogGridCardMedia} from '@/components/catalog/CatalogGridCardMedia'
import {CatalogItemDetailModal} from '@/components/catalog/CatalogItemDetailModal'
import {CatalogPuzzleIntroFit} from '@/components/page-sections/CatalogPuzzleIntroFit'
import {
  HorizontalScrollSlidesTrack,
  type HorizontalScrollSlide,
} from '@/components/page-sections/HorizontalScrollTrack'
import scrollStyles from '@/components/page-sections/horizontalScrollCards.module.css'
import {formatCatalogPurchasePriceShort} from '@/lib/catalog/catalog-borrow-price-label'
import {formatCatalogCardSizeLabel} from '@/lib/catalog/format-catalog-card-size'
import {prefetchCatalogItemDetailClient} from '@/lib/catalog/catalog-item-detail-client-fetch'
import {isMarketingCatalogItemAvailable} from '@/lib/catalog/catalog-sold-sort'
import type {ScrollCardSize} from '@/lib/catalog/scroll-card-size'
import {normalizeScrollCardSize} from '@/lib/catalog/scroll-card-size'
import type {MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'
import type {
  HorizontalScrollScrollDirection,
  HorizontalScrollScrollMotion,
  HorizontalScrollScrollSpeed,
} from '@/lib/sanity'
import {useMemo, useState} from 'react'
import styles from './catalogScrollStrip.module.css'

type Props = {
  items: MarketingCatalogGridItem[]
  heading?: string
  intro?: string
  introCtaLabel?: string
  introCtaHref?: string
  cardSize?: ScrollCardSize
  sectionKey?: string
  scrollMotion?: HorizontalScrollScrollMotion
  scrollDirection?: HorizontalScrollScrollDirection
  scrollSpeed?: HorizontalScrollScrollSpeed
  /** Resserre l’espacement quand un autre bandeau petit précède / suit. */
  stackedAfterSmall?: boolean
  stackedBeforeSmall?: boolean
}

function CatalogScrollCard({
  item,
  onOpen,
  decorative,
  priority = false,
  /** Marquee `transform` : le lazy-load navigateur ne part jamais — forcer eager. */
  eager = false,
}: {
  item: MarketingCatalogGridItem
  onOpen?: (itemId: string) => void
  /** Clone marquee : non interactif. */
  decorative?: boolean
  priority?: boolean
  eager?: boolean
}) {
  const titleLine = item.displayTitle ?? item.title
  const sizeLine = formatCatalogCardSizeLabel(item.size_label, item.size_code)
  const available = isMarketingCatalogItemAvailable(item.status)

  const body = (
    <>
      <div className={styles.catalogCardMedia}>
        <CatalogGridCardMedia
          item={item}
          priority={priority && !decorative}
          eager={(eager || priority) && !decorative}
          decorative={decorative}
        />
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
    </>
  )

  return (
    <article
      className={`${scrollStyles.slide} ${scrollStyles.slidePortrait}`}
      aria-hidden={decorative || undefined}
    >
      {decorative || !onOpen ? (
        <div className={`${styles.catalogCard} ${styles.catalogCardButton}`}>{body}</div>
      ) : (
        <button
          type="button"
          className={`${styles.catalogCard} ${styles.catalogCardButton}`}
          aria-label={`Voir ${titleLine}`}
          onClick={() => onOpen(item.id)}
          onMouseEnter={() => prefetchCatalogItemDetailClient(item.id)}
          onFocus={() => prefetchCatalogItemDetailClient(item.id)}
        >
          {body}
        </button>
      )}
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
  scrollMotion = 'manual',
  scrollDirection = 'to-left',
  scrollSpeed = 'normal',
  stackedAfterSmall,
  stackedBeforeSmall,
}: Props) {
  const [openItemId, setOpenItemId] = useState<string | null>(null)

  // `auto_loop` anime le track en CSS `transform` : loading=lazy ne se déclenche pas
  // (même bug que les bandeaux éditoriaux → eagerLoad).
  const eagerImages = scrollMotion === 'auto_loop'

  const slides: HorizontalScrollSlide[] = useMemo(
    () =>
      items.map((item, index) => ({
        key: item.id,
        node: (
          <CatalogScrollCard
            item={item}
            onOpen={setOpenItemId}
            priority={index < 2}
            eager={eagerImages}
          />
        ),
        cloneNode: <CatalogScrollCard item={item} decorative eager={eagerImages} />,
      })),
    [items, eagerImages],
  )

  if (items.length === 0) return null

  const size = normalizeScrollCardSize(cardSize)
  const showIntro = Boolean(heading?.trim() || intro?.trim() || (introCtaLabel && introCtaHref))
  const stackCls = [
    stackedAfterSmall ? styles.sectionStackedAfter : '',
    stackedBeforeSmall ? styles.sectionStackedBefore : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      className={`${styles.section}${stackCls ? ` ${stackCls}` : ''}`}
      aria-labelledby={heading?.trim() ? `catalog-scroll-${sectionKey ?? 'strip'}` : undefined}
    >
      {showIntro ? (
        <header className={styles.introWrap}>
          <CatalogPuzzleIntroFit
            heading={heading?.trim() || undefined}
            lead={intro?.trim() || undefined}
            introCtaLabel={introCtaLabel}
            introCtaHref={introCtaHref}
            compact={stackedAfterSmall || stackedBeforeSmall}
          />
        </header>
      ) : null}

      <div className={`${scrollStyles.fullBleed} ${styles.scrollBleed}`}>
        <div className={scrollStyles.scrollBlock} data-card-size={size}>
          <div className={scrollStyles.scrollViewport}>
            <HorizontalScrollSlidesTrack
              slides={slides}
              scrollMotion={scrollMotion}
              scrollDirection={scrollDirection}
              scrollSpeed={scrollSpeed}
            />
          </div>
        </div>
      </div>

      <CatalogItemDetailModal itemId={openItemId} onClose={() => setOpenItemId(null)} />
    </section>
  )
}

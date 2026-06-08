import Image from 'next/image'
import type {HorizontalScrollCard, HorizontalScrollCardsSection} from '@/lib/sanity'
import {horizontalScrollCardImageSizes, urlForCatalogPuzzleImage} from '@/lib/sanity'
import {objectPositionFromHotspot} from '@/lib/homeStagedPlacements'
import {CtaHrefLink} from '@/components/home/heroShared'
import {CatalogPuzzleIntroFit} from '@/components/page-sections/CatalogPuzzleIntroFit'
import {normalizeScrollCardSize} from '@/lib/catalog/scroll-card-size'
import styles from '@/components/page-sections/horizontalScrollCards.module.css'

type Props = {
  section: HorizontalScrollCardsSection
}

function editorialMediaClass(format?: HorizontalScrollCard['frameFormat']) {
  if (format === 'square') return styles.editorialCardMediaSquare
  if (format === 'landscape') return styles.editorialCardMediaLandscape
  return styles.editorialCardMediaPortrait
}

function slideFrameClass(format?: HorizontalScrollCard['frameFormat']) {
  if (format === 'square') return styles.slideSquare
  if (format === 'landscape') return styles.slideLandscape
  return styles.slidePortrait
}

function cardHasContent(card: HorizontalScrollCard) {
  const a = card.image?.asset
  return Boolean(a && (a._ref || a.url))
}

function ScrollCard({card}: {card: HorizontalScrollCard}) {
  const title = card.title?.trim()
  const subtitle = card.subtitle?.trim()
  const href = card.href?.trim() ?? ''
  const asset = card.image?.asset
  const imageUrl =
    asset && (asset._ref || asset.url) ? urlForCatalogPuzzleImage(card.image!).url() : null
  const alt = card.image?.alt?.trim() || title || 'Segna'
  const objectPosition = objectPositionFromHotspot(card.image?.hotspot)
  const frameCls = slideFrameClass(card.frameFormat)
  const mediaCls = editorialMediaClass(card.frameFormat)
  const shellCls = `${styles.slide} ${frameCls}`

  const inner = (
    <>
      <div className={`${styles.editorialCardMedia} ${mediaCls}`} aria-hidden={!imageUrl}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes={horizontalScrollCardImageSizes}
            quality={85}
            className={styles.editorialCardImage}
            style={{
              objectFit: 'cover',
              ...(objectPosition ? {objectPosition} : {}),
            }}
          />
        ) : null}
      </div>
      {(title || subtitle) && (
        <div className={styles.editorialCardBody}>
          {title ? <span className={styles.editorialCardTitle}>{title}</span> : null}
          {subtitle ? <span className={styles.editorialCardSubtitle}>{subtitle}</span> : null}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <CtaHrefLink href={href} className={`${styles.slideLink} ${shellCls}`}>
        <div className={styles.editorialCard}>{inner}</div>
      </CtaHrefLink>
    )
  }

  return (
    <div className={shellCls}>
      <div className={styles.editorialCard}>{inner}</div>
    </div>
  )
}

export function SectionHorizontalScrollCards({section}: Props) {
  const items = (section.items ?? []).filter(cardHasContent)
  const heading = section.heading?.trim()
  if (!heading || items.length === 0) {
    return null
  }

  const isDark = section.surfaceTheme === 'dark'
  const introTone = isDark ? 'dark' : 'light'
  const cardSize = normalizeScrollCardSize(section.cardSize)
  const surfaceStyle = {
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
  }

  return (
    <section
      className={`${styles.fullBleed}${isDark ? ` ${styles.surfaceDark}` : ` ${styles.surfaceLight}`}`}
      style={surfaceStyle}
      data-motion={section.motionPreset ?? 'none'}
    >
      <div className={styles.inner}>
        <CatalogPuzzleIntroFit
          heading={heading}
          lead={section.lead?.trim()}
          introCtaLabel={section.introCtaLabel}
          introCtaHref={section.introCtaHref}
          introTone={introTone}
        />
      </div>

      <div className={styles.scrollBlock} data-card-size={cardSize}>
        <div className={styles.scrollViewport}>
          <div className={styles.track}>
            <div className={styles.trackRow}>
              {items.map((card) => (
                <ScrollCard key={card._key} card={card} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

import Image from 'next/image'
import type {HorizontalScrollCard as HorizontalScrollCardType} from '@/lib/sanity'
import {horizontalScrollCardImageSizes, urlForCatalogPuzzleImage} from '@/lib/sanity'
import {objectPositionFromHotspot} from '@/lib/homeStagedPlacements'
import {CtaHrefLink} from '@/components/home/heroShared'
import styles from '@/components/page-sections/horizontalScrollCards.module.css'

function editorialMediaClass(format?: HorizontalScrollCardType['frameFormat']) {
  if (format === 'square') return styles.editorialCardMediaSquare
  if (format === 'landscape') return styles.editorialCardMediaLandscape
  return styles.editorialCardMediaPortrait
}

function slideFrameClass(format?: HorizontalScrollCardType['frameFormat']) {
  if (format === 'square') return styles.slideSquare
  if (format === 'landscape') return styles.slideLandscape
  return styles.slidePortrait
}

export function cardHasContent(card: HorizontalScrollCardType) {
  const a = card.image?.asset
  return Boolean(a && (a._ref || a.url))
}

type Props = {
  card: HorizontalScrollCardType
}

export function HorizontalScrollCard({card}: Props) {
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

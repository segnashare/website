'use client'

import {useCallback, useState, type KeyboardEvent} from 'react'
import Image from 'next/image'
import type {HorizontalScrollCard as HorizontalScrollCardType} from '@/lib/sanity'
import {horizontalScrollCardImageSizes, urlForCatalogPuzzleImage} from '@/lib/sanity'
import {cardHasBackQuote} from '@/lib/horizontal-scroll-card-utils'
import {objectPositionFromHotspot} from '@/lib/homeStagedPlacements'
import {CtaHrefLink} from '@/components/home/heroShared'
import {FlipCardQuote} from '@/components/page-sections/FlipCardQuote'
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

type Props = {
  card: HorizontalScrollCardType
  /** Bandeau animé : évite le lazy-load cassé par transform sur iOS. */
  eagerLoad?: boolean
  /** Doublon visuel de boucle : pas de 2e <Image>, fond CSS (même URL, cache navigateur). */
  visualClone?: boolean
  /** Contrôlé par le bouton du bandeau ; désactive le retournement des cartes avec citation. */
  flipEnabled?: boolean
}

function CardImageMedia({
  eagerLoad,
  visualClone,
  imageUrl,
  alt,
  objectPosition,
  mediaCls,
}: {
  eagerLoad?: boolean
  visualClone?: boolean
  imageUrl: string | null
  alt: string
  objectPosition?: string
  mediaCls: string
}) {
  const mediaStyle =
    visualClone && imageUrl
      ? {
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: objectPosition || 'center',
        }
      : undefined

  return (
    <div
      className={`${styles.editorialCardMedia} ${mediaCls}${visualClone ? ` ${styles.editorialCardMediaClone}` : ''}`}
      style={mediaStyle}
      aria-hidden={visualClone || !imageUrl}
    >
      {imageUrl && !visualClone ? (
        eagerLoad ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={alt}
            decoding="async"
            loading="eager"
            draggable={false}
            className={`${styles.editorialCardImage} ${styles.editorialCardImageNative}`}
            style={objectPosition ? {objectPosition} : undefined}
          />
        ) : (
          <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes={horizontalScrollCardImageSizes}
            quality={85}
            loading="lazy"
            draggable={false}
            className={styles.editorialCardImage}
            style={{
              objectFit: 'cover',
              ...(objectPosition ? {objectPosition} : {}),
            }}
          />
        )
      ) : null}
    </div>
  )
}

function FlipCardMedia({
  card,
  eagerLoad,
  imageUrl,
  alt,
  objectPosition,
  mediaCls,
}: {
  card: HorizontalScrollCardType
  eagerLoad?: boolean
  imageUrl: string | null
  alt: string
  objectPosition?: string
  mediaCls: string
}) {
  const [flipped, setFlipped] = useState(false)

  const toggleFlip = useCallback(() => {
    setFlipped((value) => !value)
  }, [])

  const onActivate = useCallback(
    (event: {stopPropagation: () => void}) => {
      event.stopPropagation()
      if (window.matchMedia('(hover: none)').matches) {
        toggleFlip()
      }
    },
    [toggleFlip],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        toggleFlip()
      }
    },
    [toggleFlip],
  )

  return (
    <div
      className={`${styles.editorialCardMedia} ${mediaCls} ${styles.flipCard} ${flipped ? styles.flipCardFlipped : ''}`}
      onClick={onActivate}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={flipped ? 'Revenir à la photo' : 'Retourner la carte pour lire la citation'}
    >
      <div className={styles.flipCardInner}>
        <div className={`${styles.flipCardFace} ${styles.flipCardFront}`}>
          {imageUrl ? (
            eagerLoad ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={alt}
                decoding="async"
                loading="eager"
                draggable={false}
                className={`${styles.editorialCardImage} ${styles.editorialCardImageNative}`}
                style={objectPosition ? {objectPosition} : undefined}
              />
            ) : (
              <Image
                src={imageUrl}
                alt={alt}
                fill
                sizes={horizontalScrollCardImageSizes}
                quality={85}
                loading="lazy"
                draggable={false}
                className={styles.editorialCardImage}
                style={{
                  objectFit: 'cover',
                  ...(objectPosition ? {objectPosition} : {}),
                }}
              />
            )
          ) : null}
        </div>
        <div className={`${styles.flipCardFace} ${styles.flipCardBack}`}>
          {card.backQuote?.length ? <FlipCardQuote value={card.backQuote} /> : null}
        </div>
      </div>
    </div>
  )
}

export function HorizontalScrollCard({card, eagerLoad, visualClone, flipEnabled = true}: Props) {
  const title = card.title?.trim()
  const subtitle = card.subtitle?.trim()
  const href = card.href?.trim() ?? ''
  const hasFlip = flipEnabled && !href && cardHasBackQuote(card)
  const asset = card.image?.asset
  const imageUrl =
    asset && (asset._ref || asset.url) ? urlForCatalogPuzzleImage(card.image!).url() : null
  const alt = card.image?.alt?.trim() || title || 'Segna'
  const objectPosition = objectPositionFromHotspot(card.image?.hotspot)
  const frameCls = slideFrameClass(card.frameFormat)
  const mediaCls = editorialMediaClass(card.frameFormat)
  const shellCls = `${styles.slide} ${frameCls}`

  const media = hasFlip ? (
    <FlipCardMedia
      card={card}
      eagerLoad={eagerLoad}
      imageUrl={imageUrl}
      alt={alt}
      objectPosition={objectPosition}
      mediaCls={mediaCls}
    />
  ) : (
    <CardImageMedia
      eagerLoad={eagerLoad}
      visualClone={visualClone}
      imageUrl={imageUrl}
      alt={alt}
      objectPosition={objectPosition}
      mediaCls={mediaCls}
    />
  )

  const inner = (
    <>
      {media}
      {(title || subtitle) && (
        <div className={styles.editorialCardBody}>
          {title ? <span className={styles.editorialCardTitle}>{title}</span> : null}
          {subtitle ? <span className={styles.editorialCardSubtitle}>{subtitle}</span> : null}
        </div>
      )}
    </>
  )

  if (visualClone) {
    return (
      <div className={shellCls} aria-hidden>
        <div className={styles.editorialCard}>{inner}</div>
      </div>
    )
  }

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

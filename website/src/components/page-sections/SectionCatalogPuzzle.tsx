import Image from 'next/image'
import type {CatalogPuzzleSection, CatalogPuzzleTile} from '@/lib/sanity'
import {
  catalogPuzzleImageSizes,
  catalogPuzzleQuarterImageSizes,
  catalogPuzzleTallImageSizes,
  urlForCatalogPuzzleImage,
} from '@/lib/sanity'
import {objectPositionFromHotspot} from '@/lib/homeStagedPlacements'
import {CtaHrefLink} from '@/components/home/heroShared'
import {CatalogPuzzleIntroFit} from '@/components/page-sections/CatalogPuzzleIntroFit'
import {inferIntroToneFromBackground} from '@/lib/inferIntroToneFromBackground'
import styles from './catalogPuzzle.module.css'

type Props = {
  section: CatalogPuzzleSection
}

function tileHasContent(tile?: CatalogPuzzleTile | null) {
  if (!tile) return false
  if (tile.title?.trim()) return true
  const a = tile.image?.asset
  return Boolean(a && (a._ref || a.url))
}

function CatalogPuzzleCard({
  tile,
  className,
  sizes,
}: {
  tile?: CatalogPuzzleTile | null
  className: string
  sizes: string
}) {
  const title = tile?.title?.trim()
  const href = tile?.href?.trim() ?? ''
  const asset = tile?.image?.asset
  const imageUrl =
    asset && (asset._ref || asset.url) ? urlForCatalogPuzzleImage(tile!.image!).url() : null
  const alt = tile?.image?.alt?.trim() || title || 'Catalogue Segna'
  const objectPosition = objectPositionFromHotspot(tile?.image?.hotspot)

  const body = (
    <>
      <div className={styles.cardMedia} aria-hidden={!imageUrl}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes={sizes}
            quality={85}
            className={styles.cardImage}
            style={{
              objectFit: 'cover',
              ...(objectPosition ? {objectPosition} : {}),
            }}
          />
        ) : null}
      </div>
      <div className={styles.cardGradient} aria-hidden />
      {title ? (
        <div className={styles.cardText}>
          <span className={styles.cardTitle}>{title}</span>
        </div>
      ) : null}
    </>
  )

  if (href) {
    return (
      <CtaHrefLink href={href} className={`${styles.card} ${className}`}>
        {body}
      </CtaHrefLink>
    )
  }

  return (
    <div className={`${styles.card} ${className}`} tabIndex={-1}>
      {body}
    </div>
  )
}

export function SectionCatalogPuzzle({section}: Props) {
  const tiles = [
    section.leftTop,
    section.leftMiddle,
    section.leftBottomLeft,
    section.leftBottomRight,
    section.rightTall,
    section.rightBottom,
  ]

  const hasIntro = Boolean(
    section.heading?.trim() ||
      section.lead?.trim() ||
      (section.introCtaLabel?.trim() && section.introCtaHref?.trim()),
  )
  if (!hasIntro && !tiles.some(tileHasContent)) {
    return null
  }

  const surfaceStyle = section.backgroundColor?.trim()
    ? {backgroundColor: section.backgroundColor.trim()}
    : undefined

  const introTone =
    section.surfaceTheme === 'light' || section.surfaceTheme === 'dark'
      ? section.surfaceTheme
      : inferIntroToneFromBackground(section.backgroundColor) ?? 'light'

  return (
    <section
      className={styles.section}
      style={surfaceStyle}
      data-motion={section.motionPreset ?? 'none'}
    >
      {hasIntro ? (
        <header>
          <CatalogPuzzleIntroFit
            heading={section.heading?.trim()}
            lead={section.lead?.trim()}
            introCtaLabel={section.introCtaLabel}
            introCtaHref={section.introCtaHref}
            introTone={introTone}
          />
        </header>
      ) : null}

      <div className={styles.scrollStrip}>
        <div className={styles.grid}>
          <CatalogPuzzleCard
            tile={section.leftTop}
            className={styles.posLeftTop}
            sizes={catalogPuzzleImageSizes}
          />
          <CatalogPuzzleCard
            tile={section.leftMiddle}
            className={styles.posLeftMiddle}
            sizes={catalogPuzzleImageSizes}
          />
          <div className={styles.leftSplit}>
            <CatalogPuzzleCard
              tile={section.leftBottomLeft}
              className={styles.posLeftBottomLeft}
              sizes={catalogPuzzleQuarterImageSizes}
            />
            <CatalogPuzzleCard
              tile={section.leftBottomRight}
              className={styles.posLeftBottomRight}
              sizes={catalogPuzzleQuarterImageSizes}
            />
          </div>
          <CatalogPuzzleCard
            tile={section.rightTall}
            className={styles.posRightTall}
            sizes={catalogPuzzleTallImageSizes}
          />
          <CatalogPuzzleCard
            tile={section.rightBottom}
            className={styles.posRightBottom}
            sizes={catalogPuzzleImageSizes}
          />
        </div>
      </div>
    </section>
  )
}

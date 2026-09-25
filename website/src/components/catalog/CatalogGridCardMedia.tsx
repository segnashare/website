'use client'

import type {MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'

import {CatalogCardBadges} from './CatalogCardBadges'
import {CATALOG_GRID_IMAGE_SIZES, CatalogItemPhotoCover} from './CatalogItemPhotoCover'

type CatalogGridCardMediaProps = {
  item: Pick<
    MarketingCatalogGridItem,
    'coverUrl' | 'coverPosition' | 'objectPosition' | 'isNew' | 'isSold' | 'isArchive'
  >
  mediaClassName?: string
  priority?: boolean
  /** Force `loading=eager` (bandeau marquee / transform). */
  eager?: boolean
  /** Clone marquee — pas de 2e next/image. */
  decorative?: boolean
  /** `sizes` next/image — défaut grille 2–6 colonnes. */
  sizes?: string
}

/** Zone image d’une carte catalogue (cadrage BO ou hotspot Sanity) + badges New/Sold. */
export function CatalogGridCardMedia({
  item,
  mediaClassName,
  priority = false,
  eager = false,
  decorative = false,
  sizes = CATALOG_GRID_IMAGE_SIZES,
}: CatalogGridCardMediaProps) {
  return (
    <>
      <CatalogItemPhotoCover
        imageUrl={item.coverUrl}
        position={item.coverPosition}
        objectPosition={item.objectPosition}
        className={mediaClassName}
        sizes={sizes}
        priority={priority}
        eager={eager || priority}
        decorative={decorative}
      />
      {item.isSold ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: 'rgba(0,0,0,0.45)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <CatalogCardBadges isNew={item.isNew} isSold={item.isSold} isArchive={item.isArchive} />
    </>
  )
}

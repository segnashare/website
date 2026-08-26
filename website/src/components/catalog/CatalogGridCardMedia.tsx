'use client'

import type {MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'

import {CatalogCardBadges} from './CatalogCardBadges'
import {CatalogItemPhotoCover} from './CatalogItemPhotoCover'

type CatalogGridCardMediaProps = {
  item: Pick<
    MarketingCatalogGridItem,
    'coverUrl' | 'coverPosition' | 'objectPosition' | 'isNew' | 'isSold'
  >
  mediaClassName?: string
  priority?: boolean
  /** Force `loading=eager` (bandeau marquee / transform). */
  eager?: boolean
  /** Clone marquee — pas de 2e next/image. */
  decorative?: boolean
  /** `sizes` next/image — défaut carte small (~207px). */
  sizes?: string
}

/** Zone image d’une carte catalogue (cadrage BO ou hotspot Sanity) + badges New/Sold. */
export function CatalogGridCardMedia({
  item,
  mediaClassName,
  priority = false,
  eager = false,
  decorative = false,
  sizes = '(max-width: 768px) 28vw, 210px',
}: CatalogGridCardMediaProps) {
  return (
    <>
      {item.coverUrl ? (
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
      ) : null}
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
      <CatalogCardBadges isNew={item.isNew} isSold={item.isSold} />
    </>
  )
}

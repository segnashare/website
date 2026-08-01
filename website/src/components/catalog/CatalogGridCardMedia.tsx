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
}

/** Zone image d’une carte catalogue (cadrage BO ou hotspot Sanity) + badges New/Sold. */
export function CatalogGridCardMedia({item, mediaClassName}: CatalogGridCardMediaProps) {
  return (
    <>
      {item.coverUrl ? (
        <CatalogItemPhotoCover
          imageUrl={item.coverUrl}
          position={item.coverPosition}
          objectPosition={item.objectPosition}
          className={mediaClassName}
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

'use client'

import type {MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'

import {CatalogItemPhotoCover} from './CatalogItemPhotoCover'

type CatalogGridCardMediaProps = {
  item: Pick<MarketingCatalogGridItem, 'coverUrl' | 'coverPosition' | 'objectPosition'>
  mediaClassName?: string
}

/** Zone image d’une carte catalogue (cadrage BO ou hotspot Sanity). */
export function CatalogGridCardMedia({item, mediaClassName}: CatalogGridCardMediaProps) {
  if (!item.coverUrl) return null
  return (
    <CatalogItemPhotoCover
      imageUrl={item.coverUrl}
      position={item.coverPosition}
      objectPosition={item.objectPosition}
      className={mediaClassName}
    />
  )
}

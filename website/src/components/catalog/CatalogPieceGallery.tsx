'use client'

import type {MarketingCatalogGallerySlot} from '@/lib/catalog/marketing-catalog-items'

import {CatalogItemPhotoCover} from './CatalogItemPhotoCover'
import styles from './catalogPieceGallery.module.css'

type CatalogPieceGalleryProps = {
  slots: MarketingCatalogGallerySlot[]
}

export function CatalogPieceGallery({slots}: CatalogPieceGalleryProps) {
  if (slots.length === 0) return null
  return (
    <div className={styles.gallery}>
      {slots.map((slot, i) => (
        <div key={`${slot.url}-${i}`} className={styles.cell}>
          <CatalogItemPhotoCover imageUrl={slot.url} position={slot.position} />
        </div>
      ))}
    </div>
  )
}

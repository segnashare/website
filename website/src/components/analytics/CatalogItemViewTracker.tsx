'use client'

import {useEffect} from 'react'
import posthog from 'posthog-js'

type Props = {
  itemId: string
  itemTitle: string
  brand: string | null | undefined
  category: string | null | undefined
  pricePoints: number | null | undefined
}

export function CatalogItemViewTracker({itemId, itemTitle, brand, category, pricePoints}: Props) {
  useEffect(() => {
    posthog.capture('catalog_item_detail_viewed', {
      item_id: itemId,
      item_title: itemTitle,
      brand,
      category,
      price_points: pricePoints ?? null,
    })
  }, [itemId]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

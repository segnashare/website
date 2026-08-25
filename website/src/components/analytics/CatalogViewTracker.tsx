'use client'

import {trackWebsiteEvent} from '@/lib/analytics/track'
import {useEffect} from 'react'

/** Une fois par session onglet : vue catalogue marketing. */
export function CatalogViewTracker({
  source = 'catalogue',
  segment,
  category,
}: {
  source?: string
  segment?: string
  category?: string
}): null {
  useEffect(() => {
    try {
      const key = `segna:ph:catalog:${source}:${segment ?? ''}:${category ?? ''}`
      if (sessionStorage.getItem(key) === '1') return
      sessionStorage.setItem(key, '1')
    } catch {
      // ignore
    }
    trackWebsiteEvent('catalog_viewed', {
      source,
      segment,
      category,
    })
  }, [category, segment, source])

  return null
}

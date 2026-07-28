'use client'

import {RECAP_WALL_ITEMS} from '@/lib/subscription/recap-wall-items'
import {preloadRecapWallImages} from '@/lib/subscription/preload-recap-wall-images'
import {useEffect} from 'react'

/**
 * Précharge le mur en cache navigateur dès qu’on est sur une page amont
 * (abonnement, etc.) — avant d’arriver sur signup / signin.
 */
export function WarmRecapWallImages() {
  useEffect(() => {
    void preloadRecapWallImages(RECAP_WALL_ITEMS)
  }, [])
  return null
}

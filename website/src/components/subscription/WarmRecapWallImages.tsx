'use client'

import {RECAP_WALL_ITEMS} from '@/lib/subscription/recap-wall-items'
import {warmRecapWallImages} from '@/lib/subscription/preload-recap-wall-images'
import {useEffect} from 'react'

/**
 * Chauffe le mur en cache navigateur dès qu’on est sur une page amont
 * (sans bloquer le paint).
 */
export function WarmRecapWallImages() {
  useEffect(() => {
    warmRecapWallImages(RECAP_WALL_ITEMS)
  }, [])
  return null
}

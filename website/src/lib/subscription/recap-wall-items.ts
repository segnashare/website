import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'

/**
 * Photos éditoriales du mur récap (assets locaux `/public/recap-wall`).
 * Pas liées au catalogue / items DB.
 */
export const RECAP_WALL_ITEMS: RecapWallItem[] = Array.from({length: 37}, (_, index) => {
  const n = String(index + 1).padStart(2, '0')
  return {
    id: `recap-wall-${n}`,
    title: `Pièce ${n}`,
    coverUrl: `/recap-wall/${n}.jpg`,
  }
})

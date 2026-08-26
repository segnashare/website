import {
  RECAP_WALL_ITEMS,
  RECAP_WALL_PRIORITY_PRELOAD_COUNT,
} from '@/lib/subscription/recap-wall-items'

/**
 * Précharge uniquement les images viewport dès le HTML (avant hydratation).
 * Le reste est chauffé après le premier paint (voir `warmRecapWallImages`).
 */
export function RecapWallImagePreloads() {
  return (
    <>
      {RECAP_WALL_ITEMS.slice(0, RECAP_WALL_PRIORITY_PRELOAD_COUNT).map((item) => (
        <link key={item.id} rel="preload" as="image" href={item.coverUrl} fetchPriority="high" />
      ))}
    </>
  )
}

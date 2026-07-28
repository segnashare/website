import {
  RECAP_WALL_ITEMS,
  RECAP_WALL_PRIORITY_PRELOAD_COUNT,
} from '@/lib/subscription/recap-wall-items'

/**
 * Précharge les images du mur dès le HTML (avant hydratation).
 * Les premières couvrent le viewport ; le reste remplit le cache pour le défilement.
 */
export function RecapWallImagePreloads() {
  return (
    <>
      {RECAP_WALL_ITEMS.map((item, index) => {
        const high = index < RECAP_WALL_PRIORITY_PRELOAD_COUNT
        return (
          <link
            key={item.id}
            rel="preload"
            as="image"
            href={item.coverUrl}
            {...(high ? {fetchPriority: 'high' as const} : {})}
          />
        )
      })}
    </>
  )
}

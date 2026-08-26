import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'
import {RECAP_WALL_PRIORITY_PRELOAD_COUNT} from '@/lib/subscription/recap-wall-items'

const inflight = new Map<string, Promise<void>>()

function preloadOne(url: string): Promise<void> {
  const existing = inflight.get(url)
  if (existing) return existing

  const promise = new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }
    const img = new Image()
    const done = () => resolve()
    img.onload = done
    img.onerror = done
    img.decoding = 'async'
    img.src = url
    if (img.complete) done()
  })

  inflight.set(url, promise)
  return promise
}

export type PreloadRecapWallOptions = {
  /** Nombre d’URLs uniques à attendre (défaut = priorité viewport). */
  limit?: number
  /** Ne jamais bloquer plus longtemps que ça (ms). */
  timeoutMs?: number
}

/**
 * Précharge les URLs du mur.
 * Par défaut : seulement le viewport prioritaire + timeout court
 * (le reste peut être chauffé en arrière-plan via `warm`).
 */
export function preloadRecapWallImages(
  items: RecapWallItem[],
  options?: PreloadRecapWallOptions,
): Promise<void> {
  if (typeof window === 'undefined' || items.length === 0) return Promise.resolve()

  const limit = options?.limit ?? RECAP_WALL_PRIORITY_PRELOAD_COUNT
  const timeoutMs = options?.timeoutMs ?? 900
  const slice = items.slice(0, Math.max(0, limit))

  const all = Promise.all(slice.map((item) => preloadOne(item.coverUrl))).then(() => undefined)

  if (timeoutMs <= 0) return all

  return Promise.race([
    all,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs)
    }),
  ])
}

/** Chauffe tout le mur en cache sans bloquer l’UI. */
export function warmRecapWallImages(items: RecapWallItem[]): void {
  if (typeof window === 'undefined' || items.length === 0) return
  void Promise.all(items.map((item) => preloadOne(item.coverUrl)))
}

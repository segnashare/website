import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'

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

/** Précharge toutes les URLs du mur ; résout quand chaque image est en cache navigateur. */
export function preloadRecapWallImages(items: RecapWallItem[]): Promise<void> {
  if (typeof window === 'undefined' || items.length === 0) return Promise.resolve()
  return Promise.all(items.map((item) => preloadOne(item.coverUrl))).then(() => undefined)
}

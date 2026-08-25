const STORAGE_KEY = 'segna_website_ongoing_orders_v1'
const EVENT = 'segna-website-order-badge'

function readCachedCount(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {count?: unknown} | number
    if (typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed)
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.count === 'number' &&
      Number.isFinite(parsed.count) &&
      parsed.count >= 0
    ) {
      return Math.trunc(parsed.count)
    }
    return null
  } catch {
    return null
  }
}

function writeCachedCount(count: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({count: Math.max(0, Math.trunc(count))}))
    window.dispatchEvent(new Event(EVENT))
  } catch {
    // private mode / quota
  }
}

/** Après un achat : incrément optimiste avant refetch. */
export function bumpWebsiteOrderBadge(_cartId?: string): void {
  const current = getWebsiteOrderBadgeCount()
  writeCachedCount(current + 1)
}

export function setWebsiteOrderBadgeCount(count: number): void {
  writeCachedCount(count)
}

/** @deprecated pastille = commandes en cours. */
export function clearWebsiteOrderBadges(): void {
  // no-op
}

export function getWebsiteOrderBadgeCount(): number {
  return readCachedCount() ?? 0
}

export function subscribeWebsiteOrderBadge(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => onChange()
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

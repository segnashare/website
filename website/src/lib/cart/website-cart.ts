/** Panier website (localStorage) — conversion avant checkout Stripe. */

export type WebsiteCartItem = {
  id: string
  title: string
  brand_label: string | null
  price_points: number | null
  imageUrl: string | null
  size_label: string | null
  size_code: string | null
}

export const WEBSITE_CART_STORAGE_KEY = 'segna_website_cart_v1'
export const WEBSITE_CART_EVENT = 'segna-website-cart'

const MAX_ITEMS = 20
const EMPTY_CART: WebsiteCartItem[] = []

/** Snapshot stable pour `useSyncExternalStore` (même référence tant que le panier ne change pas). */
let cachedItems: WebsiteCartItem[] | null = null
let cachedRaw: string | null = null

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function parseItems(raw: unknown): WebsiteCartItem[] {
  if (!Array.isArray(raw)) return EMPTY_CART
  const out: WebsiteCartItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id.trim() : ''
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    if (!id || !title) continue
    out.push({
      id,
      title,
      brand_label: typeof o.brand_label === 'string' ? o.brand_label : null,
      price_points: typeof o.price_points === 'number' && Number.isFinite(o.price_points) ? o.price_points : null,
      imageUrl: typeof o.imageUrl === 'string' ? o.imageUrl : null,
      size_label: typeof o.size_label === 'string' ? o.size_label : null,
      size_code: typeof o.size_code === 'string' ? o.size_code : null,
    })
  }
  return out.length === 0 ? EMPTY_CART : out
}

function emitCartChange(): void {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(WEBSITE_CART_EVENT))
}

function setCache(items: WebsiteCartItem[], raw: string | null): WebsiteCartItem[] {
  cachedItems = items
  cachedRaw = raw
  return items
}

function writeItems(items: WebsiteCartItem[]): WebsiteCartItem[] {
  if (!isBrowser()) return items
  const next = items.length === 0 ? EMPTY_CART : items
  const raw = next === EMPTY_CART ? null : JSON.stringify(next)
  try {
    if (raw == null) window.localStorage.removeItem(WEBSITE_CART_STORAGE_KEY)
    else window.localStorage.setItem(WEBSITE_CART_STORAGE_KEY, raw)
  } catch {
    // quota / private mode
  }
  setCache(next, raw)
  emitCartChange()
  return next
}

/** Snapshot client — référence stable tant que le contenu localStorage n’a pas changé. */
export function readWebsiteCart(): WebsiteCartItem[] {
  if (!isBrowser()) return EMPTY_CART
  try {
    const raw = window.localStorage.getItem(WEBSITE_CART_STORAGE_KEY)
    if (raw === cachedRaw && cachedItems) return cachedItems
    if (!raw) return setCache(EMPTY_CART, null)
    return setCache(parseItems(JSON.parse(raw) as unknown), raw)
  } catch {
    return setCache(EMPTY_CART, null)
  }
}

export function getWebsiteCartServerSnapshot(): WebsiteCartItem[] {
  return EMPTY_CART
}

export function addWebsiteCartItem(item: WebsiteCartItem): {
  items: WebsiteCartItem[]
  added: boolean
  alreadyInCart: boolean
} {
  const current = readWebsiteCart()
  if (current.some((row) => row.id === item.id)) {
    return {items: current, added: false, alreadyInCart: true}
  }
  if (current.length >= MAX_ITEMS) {
    return {items: current, added: false, alreadyInCart: false}
  }
  const next = [...current, item]
  return {items: writeItems(next), added: true, alreadyInCart: false}
}

export function removeWebsiteCartItem(itemId: string): WebsiteCartItem[] {
  const next = readWebsiteCart().filter((row) => row.id !== itemId)
  return writeItems(next)
}

export function clearWebsiteCart(): WebsiteCartItem[] {
  return writeItems([])
}

export function subscribeWebsiteCart(listener: () => void): () => void {
  if (!isBrowser()) return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === WEBSITE_CART_STORAGE_KEY || event.key === null) {
      cachedItems = null
      cachedRaw = null
      listener()
    }
  }
  const onLocal = () => listener()
  window.addEventListener(WEBSITE_CART_EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(WEBSITE_CART_EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}

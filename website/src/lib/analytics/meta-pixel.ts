/**
 * Événements standard Meta Pixel.
 * Mis en file si le pixel n’est pas encore là (Cookiebot), puis envoyés dès qu’il charge.
 * Abandonnés si le visiteur refuse les cookies marketing.
 */

const PENDING_PURCHASE_KEY = 'segna:meta:pending-purchase'

type MetaParams = Record<string, string | number | string[]>

type Fbq = (...args: unknown[]) => void

type QueuedEvent = {event: string; params?: MetaParams; eventId?: string}

export type MetaPurchaseSnapshot = {
  contentIds: string[]
  valueCents: number
  numItems: number
}

const queue: QueuedEvent[] = []
let flushing = false

function readFbq(): Fbq | undefined {
  return (window as Window & {fbq?: Fbq}).fbq
}

function flushQueue(): boolean {
  const fbq = readFbq()
  if (!fbq) return false
  const pending = queue.splice(0, queue.length)
  for (const item of pending) {
    if (item.eventId) fbq('track', item.event, item.params ?? {}, {eventID: item.eventId})
    else fbq('track', item.event, item.params ?? {})
  }
  return true
}

/** Le pixel est injecté après Cookiebot : on garde l’événement jusqu’à ce qu’il soit là. */
function fbqTrack(event: string, params?: MetaParams, eventId?: string): void {
  if (typeof window === 'undefined') return
  queue.push({event, params, eventId})
  if (flushQueue() || flushing) return
  flushing = true
  const stop = () => {
    window.removeEventListener('CookiebotOnAccept', onConsent)
    window.removeEventListener('CookiebotOnConsentReady', onConsent)
    window.removeEventListener('CookiebotOnDecline', onDecline)
    window.clearInterval(timer)
    flushing = false
  }
  const onConsent = () => {
    if (flushQueue()) stop()
  }
  const onDecline = () => {
    queue.splice(0, queue.length)
    stop()
  }
  window.addEventListener('CookiebotOnAccept', onConsent)
  window.addEventListener('CookiebotOnConsentReady', onConsent)
  window.addEventListener('CookiebotOnDecline', onDecline)
  const timer = window.setInterval(() => {
    if (flushQueue()) stop()
  }, 250)
  window.setTimeout(() => {
    if (!readFbq()) queue.splice(0, queue.length)
    stop()
  }, 15000)
}

function euros(cents: number): number {
  return Math.round(cents) / 100
}

function once(key: string): boolean {
  try {
    if (sessionStorage.getItem(key) === '1') return false
    sessionStorage.setItem(key, '1')
    return true
  } catch {
    return true
  }
}

export function trackMetaViewContent(input: {
  itemId: string
  name?: string
  brand?: string
  valueCents?: number
}): void {
  const params: MetaParams = {
    content_ids: [input.itemId],
    content_type: 'product',
    currency: 'EUR',
  }
  if (input.name) params.content_name = input.name
  if (input.brand) params.content_category = input.brand
  if (typeof input.valueCents === 'number' && input.valueCents > 0) params.value = euros(input.valueCents)
  fbqTrack('ViewContent', params)
}

export function trackMetaAddToCart(input: {
  itemId: string
  name?: string
  valueCents?: number
}): void {
  const params: MetaParams = {
    content_ids: [input.itemId],
    content_type: 'product',
    currency: 'EUR',
    num_items: 1,
  }
  if (input.name) params.content_name = input.name
  if (typeof input.valueCents === 'number' && input.valueCents > 0) params.value = euros(input.valueCents)
  fbqTrack('AddToCart', params)
}

export function trackMetaInitiateCheckout(input: {
  contentIds: string[]
  numItems: number
  valueCents: number
}): void {
  const params: MetaParams = {
    content_ids: input.contentIds,
    content_type: 'product',
    currency: 'EUR',
    num_items: input.numItems,
  }
  if (input.valueCents > 0) params.value = euros(input.valueCents)
  fbqTrack('InitiateCheckout', params)
}

export function trackMetaCompleteRegistration(): void {
  fbqTrack('CompleteRegistration', {status: 'complete', currency: 'EUR'})
}

export function rememberMetaPendingPurchase(snapshot: MetaPurchaseSnapshot): void {
  try {
    sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore quota / private mode
  }
}

export function takeMetaPendingPurchase(): MetaPurchaseSnapshot | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PURCHASE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PENDING_PURCHASE_KEY)
    const parsed = JSON.parse(raw) as Partial<MetaPurchaseSnapshot>
    return {
      contentIds: Array.isArray(parsed.contentIds) ? parsed.contentIds.filter((id) => typeof id === 'string') : [],
      valueCents: typeof parsed.valueCents === 'number' ? parsed.valueCents : 0,
      numItems: typeof parsed.numItems === 'number' ? parsed.numItems : 0,
    }
  } catch {
    return null
  }
}

export function clearMetaPendingPurchase(): void {
  try {
    sessionStorage.removeItem(PENDING_PURCHASE_KEY)
  } catch {
    // ignore
  }
}

/** Uniquement après confirmation du paiement. `eventId` évite un second hit au rechargement. */
export function trackMetaPurchase(eventId: string, snapshot: MetaPurchaseSnapshot | null): void {
  if (!eventId || !once(`segna:meta:purchase:${eventId}`)) return
  const params: MetaParams = {
    content_type: 'product',
    currency: 'EUR',
  }
  if (snapshot?.contentIds.length) params.content_ids = snapshot.contentIds
  if (snapshot && snapshot.numItems > 0) params.num_items = snapshot.numItems
  if (snapshot && snapshot.valueCents > 0) params.value = euros(snapshot.valueCents)
  fbqTrack('Purchase', params, `purchase:${eventId}`)
}

/** Uniquement après activation confirmée de l’abonnement. */
export function trackMetaSubscribe(input: {eventId: string; planCode: string; valueCents: number}): void {
  if (!input.eventId || !once(`segna:meta:subscribe:${input.eventId}`)) return
  fbqTrack(
    'Subscribe',
    {
      currency: 'EUR',
      value: euros(input.valueCents),
      content_name: input.planCode,
    },
    `subscribe:${input.eventId}`,
  )
}

/** Aligné app : seuil livraison offerte à l’achat (point relais / offre panier). */
export const WEBSITE_PURCHASE_FREE_SHIPPING_THRESHOLD_CENTS = 20_000

/** Libellé livraison par défaut panier website (achat). */
export const WEBSITE_DEFAULT_SHIPPING_LABEL = 'Chronopost domicile (18h)'

/** Bases domicile HT (centimes) — mêmes paliers que l’app `HOME_BASE_CENTS`. */
const HOME_BASE_HT_CENTS = [790, 913, 1362, 1362] as const
const RELAY_BASE_HT_CENTS = [376, 527, 559, 559] as const
const MAX_ITEMS = 10

function shippingTierIndex(itemCount: number): number {
  const n = Math.min(Math.max(Math.floor(itemCount), 1), MAX_ITEMS)
  return n <= 3 ? 0 : 1
}

/** Aller domicile HT (barème fixe, pas un devis Sendcloud). */
export function websiteChronopostHomeOutboundHtCents(itemCount: number): number {
  const n = Math.min(Math.max(Math.floor(itemCount), 1), MAX_ITEMS)
  const idx = shippingTierIndex(n)
  const homeBase = HOME_BASE_HT_CENTS[idx]
  const relayBase = RELAY_BASE_HT_CENTS[idx]
  const extraArticles = Math.max(0, n - 3)
  if (extraArticles === 0) return homeBase
  const ratio = homeBase / relayBase
  return homeBase + Math.round(100 * ratio * extraArticles)
}

/** TTC affiché (TVA 20 %). */
export function websiteChronopostHomeOutboundTtcCents(itemCount: number): number {
  return Math.round(websiteChronopostHomeOutboundHtCents(itemCount) * 1.2)
}

export function websitePurchaseFreeShippingProgressRatio(subtotalCents: number): number {
  if (WEBSITE_PURCHASE_FREE_SHIPPING_THRESHOLD_CENTS <= 0) return 1
  return Math.min(1, Math.max(0, subtotalCents / WEBSITE_PURCHASE_FREE_SHIPPING_THRESHOLD_CENTS))
}

export function websitePurchaseFreeShippingMissingCents(subtotalCents: number): number {
  return Math.max(0, WEBSITE_PURCHASE_FREE_SHIPPING_THRESHOLD_CENTS - Math.max(0, subtotalCents))
}

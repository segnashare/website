/**
 * Codes promo achat website (checkout).
 * Validés côté client (feedback immédiat) et renvoyés au checkout Stripe app
 * pour appliquer la récompense (ex. livraison offerte).
 */

export type WebsitePurchasePromoReward = 'free_shipping'

export type WebsitePurchasePromoStatus = 'active' | 'obsolete'

export type WebsitePurchasePromoDefinition = {
  code: string
  status: WebsitePurchasePromoStatus
  reward: WebsitePurchasePromoReward
  /** Libellé court pour le message de succès. */
  rewardLabel: string
}

export type WebsitePurchasePromoValidation =
  | {
      ok: true
      code: string
      reward: WebsitePurchasePromoReward
      message: string
    }
  | {
      ok: false
      reason: 'empty' | 'invalid' | 'obsolete'
      message: string
    }

/** Catalogue : ajouter ici les codes actifs ou obsolètes. */
const WEBSITE_PURCHASE_PROMOS: readonly WebsitePurchasePromoDefinition[] = [
  {
    code: '120972',
    status: 'active',
    reward: 'free_shipping',
    rewardLabel: 'Livraison offerte',
  },
]

export function normalizeWebsitePurchasePromoCode(raw: string): string {
  return raw.trim().toUpperCase()
}

function findWebsitePurchasePromo(normalized: string): WebsitePurchasePromoDefinition | null {
  if (!normalized) return null
  return (
    WEBSITE_PURCHASE_PROMOS.find((p) => normalizeWebsitePurchasePromoCode(p.code) === normalized) ??
    null
  )
}

export function validateWebsitePurchasePromoCode(raw: string): WebsitePurchasePromoValidation {
  const normalized = normalizeWebsitePurchasePromoCode(raw)
  if (!normalized) {
    return {ok: false, reason: 'empty', message: ''}
  }

  const promo = findWebsitePurchasePromo(normalized)
  if (!promo) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Ce code promo n’est pas valide.',
    }
  }

  if (promo.status === 'obsolete') {
    return {
      ok: false,
      reason: 'obsolete',
      message: 'Ce code promo est obsolète et ne peut plus être utilisé.',
    }
  }

  return {
    ok: true,
    code: promo.code,
    reward: promo.reward,
    message: `Code appliqué : ${promo.rewardLabel}.`,
  }
}

export function websitePurchasePromoGrantsFreeShipping(raw: string | null | undefined): boolean {
  if (!raw) return false
  const result = validateWebsitePurchasePromoCode(raw)
  return result.ok && result.reward === 'free_shipping'
}

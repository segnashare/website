/** Tarif emprunt 7 jours par crédit (aligné app economy v2). */
export const CATALOG_BORROW_CENTS_PER_CREDIT_7_DAYS = 10

/** Prix d’achat catalogue : 1 € / crédit (aligné `computeItemPurchaseEuroCents` app). */
export const CATALOG_PURCHASE_CENTS_PER_CREDIT = 100

export function catalogBorrowPriceCents(pricePoints: number): number {
  const credits = Math.max(0, Math.trunc(pricePoints))
  return credits * CATALOG_BORROW_CENTS_PER_CREDIT_7_DAYS
}

export function catalogPurchasePriceCents(pricePoints: number): number {
  const credits = Math.max(0, Math.trunc(pricePoints))
  return credits * CATALOG_PURCHASE_CENTS_PER_CREDIT
}

/** Format boutique : « €380,00 » (€ préfixe, virgule, 2 décimales). */
function formatEuroPrefix(cents: number): string {
  const amount = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
  return `€${amount}`
}

/** Libellé location (legacy) : « €1,50/ 7 jours » pour 15 crédits. */
export function formatCatalogBorrowPriceLabel(pricePoints: number | null): string {
  if (typeof pricePoints !== 'number' || Number.isNaN(pricePoints)) return '—'
  return `${formatEuroPrefix(catalogBorrowPriceCents(pricePoints))}/ 7 jours`
}

/** Prix d’achat — ex. « €280,00 ». */
export function formatCatalogPurchasePriceLabel(pricePoints: number | null): string {
  if (typeof pricePoints !== 'number' || Number.isNaN(pricePoints)) return '—'
  return formatEuroPrefix(catalogPurchasePriceCents(pricePoints))
}

/** Montant € achat (cartes catalogue) — ex. « €280,00 ». */
export function formatCatalogPurchasePriceShort(pricePoints: number | null): string {
  if (typeof pricePoints !== 'number' || Number.isNaN(pricePoints)) return '—'
  return formatEuroPrefix(catalogPurchasePriceCents(pricePoints))
}

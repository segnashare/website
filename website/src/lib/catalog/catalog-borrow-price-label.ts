/** Tarif emprunt 7 jours par crédit (aligné app economy v2). */
export const CATALOG_BORROW_CENTS_PER_CREDIT_7_DAYS = 10

export function catalogBorrowPriceCents(pricePoints: number): number {
  const credits = Math.max(0, Math.trunc(pricePoints))
  return credits * CATALOG_BORROW_CENTS_PER_CREDIT_7_DAYS
}

function formatEuroAmountTight(cents: number): string {
  const amount = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
  return `${amount}€`
}

/** Libellé catalogue : « 1,50€/ 7 jours » pour une pièce à 15 crédits. */
export function formatCatalogBorrowPriceLabel(pricePoints: number | null): string {
  if (typeof pricePoints !== 'number' || Number.isNaN(pricePoints)) return '—'
  return `${formatEuroAmountTight(catalogBorrowPriceCents(pricePoints))}/ 7 jours`
}

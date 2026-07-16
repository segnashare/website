import {isMarketingCatalogItemSold} from '@/lib/catalog/catalog-card-badges'

/** Disponible à l’emprunt / panier (point bleu). */
export function isMarketingCatalogItemAvailable(status: string | null | undefined): boolean {
  return status === 'available' || status === 'in_cart' || status === 'listed'
}

/**
 * Compare pour tri catalogue : les pièces `sold` passent toujours après les autres,
 * quel que soit le critère (prix, nouveautés…).
 */
export function compareMarketingCatalogSoldLast<T extends {status?: string | null; isSold?: boolean}>(
  a: T,
  b: T,
): number {
  const aSold = a.isSold === true || isMarketingCatalogItemSold(a.status)
  const bSold = b.isSold === true || isMarketingCatalogItemSold(b.status)
  if (aSold === bSold) return 0
  return aSold ? 1 : -1
}

/** Trie une liste en place / copie : sold en dernier, puis `compare`. */
export function sortMarketingCatalogSoldLast<T extends {status?: string | null; isSold?: boolean}>(
  list: T[],
  compare?: (a: T, b: T) => number,
): T[] {
  const copy = [...list]
  copy.sort((a, b) => {
    const sold = compareMarketingCatalogSoldLast(a, b)
    if (sold !== 0) return sold
    return compare ? compare(a, b) : 0
  })
  return copy
}

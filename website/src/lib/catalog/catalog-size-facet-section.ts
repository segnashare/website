/** Préfixe catalogue `public.sizes.code` pour les pointures (cf. onboarding `shoes:${code}`). */
const SHOES_CODE_PREFIX = 'shoes:'

export type CatalogSizeFacetLike = {
  label: string
  code?: string | null
}

export function isMarketingCatalogShoeSizeFacetCode(code: string | null | undefined): boolean {
  const c = typeof code === 'string' ? code.trim().toLowerCase() : ''
  return c.startsWith(SHOES_CODE_PREFIX)
}

/**
 * Sépare les facettes taille pour le rail catalogue : pointures vs tailles vêtements (haut/bas, S/M/L…).
 * Les entrées sans code explicite `shoes:` vont côté « tailles » (comportement conservateur).
 */
export function splitMarketingCatalogSizeFacets<T extends CatalogSizeFacetLike>(sizes: T[]): {
  shoeSizes: T[]
  apparelSizes: T[]
} {
  const shoeSizes: T[] = []
  const apparelSizes: T[] = []
  for (const s of sizes) {
    if (isMarketingCatalogShoeSizeFacetCode(s.code)) shoeSizes.push(s)
    else apparelSizes.push(s)
  }
  const cmp = (a: T, b: T) => a.label.localeCompare(b.label, 'fr', {numeric: true, sensitivity: 'base'})
  shoeSizes.sort(cmp)
  apparelSizes.sort(cmp)
  return {shoeSizes, apparelSizes}
}

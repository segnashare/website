import {
  aggregateApparelSizeFacets,
  type ApparelSizeFacetLike,
} from '@/lib/catalog/apparel-size-referential'

export {aggregateApparelSizeFacets}

/** Préfixe catalogue `public.sizes.code` pour les pointures (cf. onboarding `shoes:${code}`). */
const SHOES_CODE_PREFIX = 'shoes:'

export type CatalogSizeFacetLike = {
  label: string
  code?: string | null
  memberIds?: string[]
}

export function isMarketingCatalogShoeSizeFacetCode(code: string | null | undefined): boolean {
  const c = typeof code === 'string' ? code.trim().toLowerCase() : ''
  return c.startsWith(SHOES_CODE_PREFIX)
}

/**
 * Sépare les facettes taille pour le rail catalogue : pointures vs tailles vêtements.
 * Les tailles vêtements sont déjà agrégées (top+bottom) en amont quand possible.
 */
export function splitMarketingCatalogSizeFacets<T extends CatalogSizeFacetLike>(sizes: T[]): {
  shoeSizes: T[]
  apparelSizes: T[]
} {
  const shoeSizes: T[] = []
  const apparelRaw: T[] = []
  for (const s of sizes) {
    if (isMarketingCatalogShoeSizeFacetCode(s.code)) shoeSizes.push(s)
    else apparelRaw.push(s)
  }

  // Si déjà agrégées (`apparel:` / memberIds), ne pas re-agréger.
  const alreadyAggregated = apparelRaw.some(
    (s) =>
      (typeof s.code === 'string' && s.code.trim().toLowerCase().startsWith('apparel:')) ||
      (Array.isArray(s.memberIds) && s.memberIds.length > 1),
  )

  let apparelSizes: T[]
  if (alreadyAggregated) {
    apparelSizes = apparelRaw
  } else {
    apparelSizes = aggregateApparelSizeFacets(apparelRaw as unknown as ApparelSizeFacetLike[]).map(
      (row) =>
        ({
          ...(row as unknown as T),
          id: row.id,
          label: row.label,
          code: row.code,
          memberIds: row.memberIds,
        }) as T,
    )
  }

  const cmp = (a: T, b: T) => a.label.localeCompare(b.label, 'fr', {numeric: true, sensitivity: 'base'})
  shoeSizes.sort(cmp)
  apparelSizes.sort(cmp)
  return {shoeSizes, apparelSizes}
}

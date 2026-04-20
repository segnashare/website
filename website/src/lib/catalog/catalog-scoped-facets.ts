import type {
  MarketingCatalogCategoryNavOption,
  MarketingCatalogFacetOption,
} from '@/lib/catalog/marketing-catalog-items'

/**
 * Garde les nœuds de l’arbre dont au moins une feuille apparaît dans `scoped` (ids de catégories portées par des items).
 */
export function mergeCategoriesNavWithScopedPresence(
  full: MarketingCatalogCategoryNavOption[],
  scoped: MarketingCatalogFacetOption[],
): MarketingCatalogCategoryNavOption[] {
  const scopedIds = new Set(scoped.map((s) => s.id))
  if (scopedIds.size === 0) return []

  const byId = new Map(full.map((c) => [c.id, c]))
  const keep = new Set<string>()

  for (const id of scopedIds) {
    let cur: string | null = id
    const seen = new Set<string>()
    while (cur && !seen.has(cur)) {
      seen.add(cur)
      keep.add(cur)
      const node = byId.get(cur)
      cur = node?.parentId ?? null
    }
  }

  return full.filter((c) => keep.has(c.id))
}

import type {MarketingCatalogCategoryNavOption} from '@/lib/catalog/marketing-catalog-items'

export function orderedCategories(
  categories: MarketingCatalogCategoryNavOption[],
): MarketingCatalogCategoryNavOption[] {
  return [...categories].sort((a, b) => {
    const ao = a.sortOrder ?? 0
    const bo = b.sortOrder ?? 0
    if (ao !== bo) return ao - bo
    return a.label.localeCompare(b.label, 'fr')
  })
}

/** Identifiants à envoyer au RPC (liste plate : la catégorie elle-même). */
export function collectDescendantCategoryIds(
  rootId: string,
  _categories: Pick<MarketingCatalogCategoryNavOption, 'id'>[],
): string[] {
  return [rootId]
}

export function categoryRoots(categories: MarketingCatalogCategoryNavOption[]): MarketingCatalogCategoryNavOption[] {
  return orderedCategories(categories)
}

export function categoryBySlug(
  categories: MarketingCatalogCategoryNavOption[],
  slug: string,
): MarketingCatalogCategoryNavOption | undefined {
  const s = slug.trim().toLowerCase()
  return categories.find((c) => c.slug === s)
}

export function rootCategoryForSlug(
  categories: MarketingCatalogCategoryNavOption[],
  slug: string,
): MarketingCatalogCategoryNavOption | null {
  return categoryBySlug(categories, slug) ?? null
}

export function categorySubtreeContainsResolvedSlug(
  categories: MarketingCatalogCategoryNavOption[],
  rootSlug: string,
  activeCategorySlug: string,
): boolean {
  const root = categoryBySlug(categories, rootSlug)
  const node = categoryBySlug(categories, activeCategorySlug)
  if (!root || !node) return false
  return node.id === root.id
}

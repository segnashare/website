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

/** Identifiants à envoyer au RPC : la catégorie et toutes ses sous-catégories. */
export function collectDescendantCategoryIds(
  rootId: string,
  categories: Pick<MarketingCatalogCategoryNavOption, 'id' | 'parentId'>[],
): string[] {
  const childrenByParent = new Map<string, string[]>()
  for (const cat of categories) {
    if (!cat.parentId) continue
    const list = childrenByParent.get(cat.parentId)
    if (list) list.push(cat.id)
    else childrenByParent.set(cat.parentId, [cat.id])
  }
  const out: string[] = []
  const stack = [rootId]
  const seen = new Set<string>()
  while (stack.length > 0) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
    const kids = childrenByParent.get(id)
    if (kids) stack.push(...kids)
  }
  return out
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

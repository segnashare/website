import type {MarketingCatalogCategoryNavOption} from '@/lib/catalog/marketing-catalog-items'

/** Tous les nœuds descendants de `rootId` (y compris la racine). */
export function collectDescendantCategoryIds(
  rootId: string,
  categories: Pick<MarketingCatalogCategoryNavOption, 'id' | 'parentId'>[],
): string[] {
  const byParent = new Map<string | null, string[]>()
  for (const c of categories) {
    const p = c.parentId
    const arr = byParent.get(p) ?? []
    arr.push(c.id)
    byParent.set(p, arr)
  }
  const out: string[] = []
  const stack = [rootId]
  while (stack.length) {
    const cur = stack.pop()!
    out.push(cur)
    const children = byParent.get(cur) ?? []
    for (const ch of children) stack.push(ch)
  }
  return out
}

export function categoryRoots(categories: MarketingCatalogCategoryNavOption[]): MarketingCatalogCategoryNavOption[] {
  return categories.filter((c) => c.parentId == null).sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

export function childrenOf(
  parentId: string,
  categories: MarketingCatalogCategoryNavOption[],
): MarketingCatalogCategoryNavOption[] {
  return categories.filter((c) => c.parentId === parentId).sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

export function categoryBySlug(
  categories: MarketingCatalogCategoryNavOption[],
  slug: string,
): MarketingCatalogCategoryNavOption | undefined {
  const s = slug.trim().toLowerCase()
  return categories.find((c) => c.slug === s)
}

/** Remonte à la racine `parentId === null` pour une catégorie identifiée par son slug URL. */
export function rootCategoryForSlug(
  categories: MarketingCatalogCategoryNavOption[],
  slug: string,
): MarketingCatalogCategoryNavOption | null {
  const cat = categoryBySlug(categories, slug)
  if (!cat) return null
  if (cat.parentId == null) return cat
  let pid: string | null = cat.parentId
  while (pid) {
    const p = categories.find((x) => x.id === pid)
    if (!p) break
    if (p.parentId == null) return p
    pid = p.parentId
  }
  return null
}

export function categorySubtreeContainsResolvedSlug(
  categories: MarketingCatalogCategoryNavOption[],
  rootSlug: string,
  activeCategorySlug: string,
): boolean {
  const root = categoryBySlug(categories, rootSlug)
  const node = categoryBySlug(categories, activeCategorySlug)
  if (!root || root.parentId != null || !node) return false
  if (node.id === root.id) return true
  let pid: string | null = node.parentId
  while (pid) {
    if (pid === root.id) return true
    const p = categories.find((x) => x.id === pid)
    pid = p?.parentId ?? null
  }
  return false
}

import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import type {CatalogPathResolved} from '@/lib/catalog/catalog-path-types'
import type {MarketingCatalogFacetsNav} from '@/lib/catalog/marketing-catalog-items'

export type IdsForCatalogRpcOptions = {
  /** Slugs couleur/taille : résolution sur les facettes globales (rails affichés = facettes filtrées). */
  slugFacetSource?: MarketingCatalogFacetsNav
}

export function idsForCatalogRpc(
  resolved: CatalogPathResolved,
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
  opts?: IdsForCatalogRpcOptions,
): {
  categoryIds: string[]
  brandIds: string[]
  colorIds: string[]
  sizeIds: string[]
} {
  const slugSrc = opts?.slugFacetSource ?? facets

  let categoryIds: string[] = []
  let brandIds: string[] = []

  if (resolved.kind === 'brand') {
    brandIds = [resolved.brandId]
  } else if (resolved.kind === 'category') {
    categoryIds = resolved.categoryFilterIds
  } else if (resolved.kind === 'intersection') {
    brandIds = [resolved.brandId]
    categoryIds = resolved.categoryFilterIds
  }

  const colorIds = (query.colorSlugs ?? [])
    .map((slug) => slugSrc.colors.find((c) => c.slug === slug)?.id)
    .filter((x): x is string => Boolean(x))

  const sizeIds = (query.sizeSlugs ?? [])
    .map((slug) => slugSrc.sizes.find((s) => s.slug === slug)?.id)
    .filter((x): x is string => Boolean(x))

  return {categoryIds, brandIds, colorIds, sizeIds}
}

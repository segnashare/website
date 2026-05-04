import type {MarketingCatalogFacetsNav} from '@/lib/catalog/marketing-catalog-items'

/** Données sérialisables pour la recherche hero (client). */
export type HomeCatalogSearchNav = {
  brands: Array<{slug: string; label: string}>
  categories: Array<{id: string; slug: string; label: string; parentId: string | null}>
}

export function homeCatalogSearchNavFromFacets(nav: MarketingCatalogFacetsNav | null): HomeCatalogSearchNav | null {
  if (!nav) return null
  return {
    brands: nav.brands.map((b) => ({slug: b.slug, label: b.label})),
    categories: nav.categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      label: c.label,
      parentId: c.parentId,
    })),
  }
}

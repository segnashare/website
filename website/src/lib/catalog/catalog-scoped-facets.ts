import type {MarketingCatalogFacetOption} from '@/lib/catalog/marketing-catalog-items'
import type {MarketingCatalogCategoryNavOption} from '@/lib/catalog/marketing-catalog-items'

/** Nav plat : on affiche toutes les catégories, même vides. */
export function mergeCategoriesNavWithScopedPresence(
  full: MarketingCatalogCategoryNavOption[],
  _scoped: MarketingCatalogFacetOption[],
): MarketingCatalogCategoryNavOption[] {
  return full
}

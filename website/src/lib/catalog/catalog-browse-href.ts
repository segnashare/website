import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {mergePathAndQuery} from '@/lib/catalog/catalog-search-params'
import type {CatalogSortMode} from '@/lib/catalog/marketing-catalog-items'

/** Chemin catalogue sans query (`/catalogue`, `/catalogue/marque`, `/catalogue/marque/categorie`). */
export function catalogBrowsePath(brandSlug: string | null, categorySlug: string | null): string {
  if (brandSlug && categorySlug) return `/catalogue/${brandSlug}/${categorySlug}`
  if (brandSlug) return `/catalogue/${brandSlug}`
  if (categorySlug) return `/catalogue/${categorySlug}`
  return '/catalogue'
}

export function withQuery(pathname: string, q: CatalogBrowseQuery): string {
  return mergePathAndQuery(pathname, q)
}

export function withSort(pathname: string, base: CatalogBrowseQuery, sort: CatalogSortMode): string {
  return mergePathAndQuery(pathname, {...base, sort, page: 1})
}

export function toggleColorHref(pathname: string, base: CatalogBrowseQuery, colorSlug: string): string {
  const set = new Set(base.colorSlugs)
  if (set.has(colorSlug)) set.delete(colorSlug)
  else set.add(colorSlug)
  return mergePathAndQuery(pathname, {
    ...base,
    page: 1,
    colorSlugs: [...set].sort(),
  })
}

export function toggleSizeHref(pathname: string, base: CatalogBrowseQuery, sizeSlug: string): string {
  const set = new Set(base.sizeSlugs)
  if (set.has(sizeSlug)) set.delete(sizeSlug)
  else set.add(sizeSlug)
  return mergePathAndQuery(pathname, {
    ...base,
    page: 1,
    sizeSlugs: [...set].sort(),
  })
}

export function pageHref(pathname: string, base: CatalogBrowseQuery, page: number): string {
  return mergePathAndQuery(pathname, {...base, page})
}

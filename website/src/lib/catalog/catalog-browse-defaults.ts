import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'

/** Query catalogue sans filtres — rendu SSR unique par chemin (cache CDN / ISR). */
export const DEFAULT_CATALOG_BROWSE_QUERY: CatalogBrowseQuery = {
  page: 1,
  sort: 'recent',
  colorSlugs: [],
  sizeSlugs: [],
  availabilitySlugs: [],
  categorySlugs: [],
  brandSlugs: [],
  segmentSlug: null,
  subSlug: null,
  newOnly: false,
  archiveOnly: false,
  tagSlug: null,
  tagSlugs: [],
  materialSlugs: [],
  lookSlug: null,
}

export function catalogBrowseQueriesEqual(a: CatalogBrowseQuery, b: CatalogBrowseQuery): boolean {
  const aa = {
    colorSlugs: a.colorSlugs ?? [],
    sizeSlugs: a.sizeSlugs ?? [],
    availabilitySlugs: a.availabilitySlugs ?? [],
    categorySlugs: a.categorySlugs ?? [],
    brandSlugs: a.brandSlugs ?? [],
    tagSlugs: a.tagSlugs?.length ? a.tagSlugs : a.tagSlug ? [a.tagSlug] : [],
    materialSlugs: a.materialSlugs ?? [],
  }
  const bb = {
    colorSlugs: b.colorSlugs ?? [],
    sizeSlugs: b.sizeSlugs ?? [],
    availabilitySlugs: b.availabilitySlugs ?? [],
    categorySlugs: b.categorySlugs ?? [],
    brandSlugs: b.brandSlugs ?? [],
    tagSlugs: b.tagSlugs?.length ? b.tagSlugs : b.tagSlug ? [b.tagSlug] : [],
    materialSlugs: b.materialSlugs ?? [],
  }
  return (
    a.page === b.page &&
    a.sort === b.sort &&
    aa.colorSlugs.join(',') === bb.colorSlugs.join(',') &&
    aa.sizeSlugs.join(',') === bb.sizeSlugs.join(',') &&
    aa.availabilitySlugs.join(',') === bb.availabilitySlugs.join(',') &&
    [...aa.categorySlugs].sort().join(',') === [...bb.categorySlugs].sort().join(',') &&
    [...aa.brandSlugs].sort().join(',') === [...bb.brandSlugs].sort().join(',') &&
    a.segmentSlug === b.segmentSlug &&
    a.subSlug === b.subSlug &&
    Boolean(a.newOnly) === Boolean(b.newOnly) &&
    Boolean(a.archiveOnly) === Boolean(b.archiveOnly) &&
    [...aa.tagSlugs].sort().join(',') === [...bb.tagSlugs].sort().join(',') &&
    [...aa.materialSlugs].sort().join(',') === [...bb.materialSlugs].sort().join(',') &&
    (a.lookSlug ?? null) === (b.lookSlug ?? null)
  )
}

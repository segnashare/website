import {orderedCategories} from '@/lib/catalog/catalog-category-tree'
import {slugifyFr} from '@/lib/catalog/catalog-slugs'
import {fetchMarketingCatalogPathResolveNav} from '@/lib/catalog/marketing-catalog-items'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import {catalogDataRevalidateSec, withDataCache} from '@/lib/sanity-cache'

export type CatalogCmsFacetOption = {slug: string; label: string}

export type CatalogCmsFacetOptions = {
  categories: CatalogCmsFacetOption[]
  brands: CatalogCmsFacetOption[]
  colors: CatalogCmsFacetOption[]
  materials: CatalogCmsFacetOption[]
  tags: CatalogCmsFacetOption[]
}

function asOption(slug: string, label: string): CatalogCmsFacetOption | null {
  const s = slug.trim()
  const l = label.trim()
  if (!s || !l) return null
  return {slug: s, label: l}
}

async function fetchCatalogCmsFacetOptionsUncached(): Promise<CatalogCmsFacetOptions | null> {
  const [nav, supabase] = await Promise.all([
    fetchMarketingCatalogPathResolveNav(),
    Promise.resolve(getSupabaseServiceRoleClient()),
  ])
  if (!nav || !supabase) return null

  const [{data: materialRows}, {data: tagRows}] = await Promise.all([
    supabase.from('item_materiaux').select('label, slug').order('label', {ascending: true}).limit(500),
    supabase
      .from('tags')
      .select('label, slug')
      .eq('is_active', true)
      .order('sort_order', {ascending: true})
      .limit(500),
  ])

  const materials: CatalogCmsFacetOption[] = []
  if (Array.isArray(materialRows)) {
    for (const row of materialRows) {
      if (!row || typeof row !== 'object') continue
      const label = typeof row.label === 'string' ? row.label : ''
      const dbSlug = typeof row.slug === 'string' ? row.slug.trim() : ''
      const opt = asOption(dbSlug || slugifyFr(label), label)
      if (opt) materials.push(opt)
    }
  }

  const tags: CatalogCmsFacetOption[] = []
  if (Array.isArray(tagRows)) {
    for (const row of tagRows) {
      if (!row || typeof row !== 'object') continue
      const label = typeof row.label === 'string' ? row.label : ''
      const dbSlug = typeof row.slug === 'string' ? row.slug.trim() : ''
      const opt = asOption(dbSlug || slugifyFr(label), label)
      if (opt) tags.push(opt)
    }
  }

  return {
    categories: orderedCategories(nav.categories).map((c) => ({slug: c.slug, label: c.label})),
    brands: [...nav.brands]
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
      .map((b) => ({slug: b.slug, label: b.label})),
    colors: nav.colors.map((c) => ({slug: c.slug, label: c.label})),
    materials,
    tags,
  }
}

export const fetchCatalogCmsFacetOptions = withDataCache(
  fetchCatalogCmsFacetOptionsUncached,
  ['catalog_cms_facet_options_v1'],
  {revalidate: catalogDataRevalidateSec()},
)

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

type CategoryRow = {
  id: string
  name: string
  slug: string
  parent_category_id: string | null
}

function categoryLabelWithParents(row: CategoryRow, byId: Map<string, CategoryRow>): string {
  const parts: string[] = [row.name]
  const seen = new Set<string>([row.id])
  let parentId = row.parent_category_id
  while (parentId) {
    if (seen.has(parentId)) break
    seen.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    parts.unshift(parent.name)
    parentId = parent.parent_category_id
  }
  return parts.join(' › ')
}

async function fetchItemCategoryRows(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
) {
  const withParent = await supabase
    .from('item_categories')
    .select('id, name, slug, parent_category_id')
    .order('name', {ascending: true})
    .limit(500)
  if (!withParent.error) return withParent.data
  const fallback = await supabase
    .from('item_categories')
    .select('id, name, slug')
    .order('name', {ascending: true})
    .limit(500)
  if (fallback.error) {
    console.error('[catalog-cms-facet-options] item_categories', fallback.error.message)
    return []
  }
  return fallback.data
}

async function fetchItemCategoryOptions(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
): Promise<CatalogCmsFacetOption[]> {
  const catRows = await fetchItemCategoryRows(supabase)
  if (!Array.isArray(catRows)) return []

  const parsed: CategoryRow[] = []
  const byId = new Map<string, CategoryRow>()
  for (const row of catRows) {
    if (!row || typeof row !== 'object') continue
    const id = typeof row.id === 'string' ? row.id : ''
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    if (!id || !name) continue
    const dbSlug = typeof row.slug === 'string' ? row.slug.trim() : ''
    const parentRaw = (row as {parent_category_id?: unknown}).parent_category_id
    const parent_category_id = typeof parentRaw === 'string' && parentRaw.trim() ? parentRaw.trim() : null
    const parsedRow: CategoryRow = {
      id,
      name,
      slug: dbSlug || slugifyFr(name),
      parent_category_id,
    }
    parsed.push(parsedRow)
    byId.set(id, parsedRow)
  }

  const options: CatalogCmsFacetOption[] = []
  for (const row of parsed) {
    const opt = asOption(row.slug, categoryLabelWithParents(row, byId))
    if (opt) options.push(opt)
  }
  return options.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

async function fetchCatalogCmsFacetOptionsUncached(): Promise<CatalogCmsFacetOptions | null> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const [nav, categories, {data: materialRows}, {data: tagRows}] = await Promise.all([
    fetchMarketingCatalogPathResolveNav(),
    fetchItemCategoryOptions(supabase),
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
    categories,
    brands: [...(nav?.brands ?? [])]
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
      .map((b) => ({slug: b.slug, label: b.label})),
    colors: (nav?.colors ?? []).map((c) => ({slug: c.slug, label: c.label})),
    materials,
    tags,
  }
}

export const fetchCatalogCmsFacetOptions = withDataCache(
  fetchCatalogCmsFacetOptionsUncached,
  ['catalog_cms_facet_options_v3'],
  {revalidate: catalogDataRevalidateSec()},
)

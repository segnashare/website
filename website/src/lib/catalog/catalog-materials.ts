import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import {slugifyFr} from '@/lib/catalog/catalog-slugs'
import {catalogDataRevalidateSec, withDataCache} from '@/lib/sanity-cache'

export type CatalogMaterialNavOption = {id: string; slug: string; label: string}

async function fetchMarketingCatalogMaterialsUncached(): Promise<CatalogMaterialNavOption[]> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return []

  const {data, error} = await supabase
    .from('item_materiaux')
    .select('id, label, slug')
    .order('label', {ascending: true})
    .limit(500)

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog] materials', error.message)
    }
    return []
  }

  const out: CatalogMaterialNavOption[] = []
  if (!Array.isArray(data)) return out
  for (const row of data) {
    if (!row || typeof row !== 'object') continue
    const id = typeof row.id === 'string' ? row.id : ''
    const label = typeof row.label === 'string' ? row.label.trim() : ''
    if (!id || !label) continue
    const dbSlug = typeof row.slug === 'string' ? row.slug.trim() : ''
    out.push({id, label, slug: dbSlug ? slugifyFr(dbSlug) : slugifyFr(label)})
  }
  return out
}

export const fetchMarketingCatalogMaterials = withDataCache(
  fetchMarketingCatalogMaterialsUncached,
  ['marketing_catalog_materials_v1'],
  {revalidate: catalogDataRevalidateSec()},
)

export function materialIdsFromSlugs(
  slugs: readonly string[],
  materials: readonly CatalogMaterialNavOption[],
): string[] {
  if (slugs.length === 0) return []
  const wanted = new Set(slugs.map((s) => slugifyFr(s)))
  return materials.filter((m) => wanted.has(m.slug)).map((m) => m.id)
}

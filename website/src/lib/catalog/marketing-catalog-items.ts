import {slugifyFr, withUniqueSlugs} from '@/lib/catalog/catalog-slugs'
import {collectPhotoPathsFromItemPhotos, getFirstPhotoStoragePath} from '@/lib/catalog/item-photos'
import {createSignedUrlForStoragePath, type StorageSignClient} from '@/lib/catalog/storage-signed-url'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'

export type CatalogSortMode = 'recent' | 'price_asc' | 'price_desc'

export type MarketingCatalogFacetOption = {
  id: string
  label: string
}

export type MarketingCatalogFacets = {
  categories: MarketingCatalogFacetOption[]
  brands: MarketingCatalogFacetOption[]
  colors: MarketingCatalogFacetOption[]
  sizes: MarketingCatalogFacetOption[]
}

export type MarketingCatalogFacetNavOption = MarketingCatalogFacetOption & {slug: string}

export type MarketingCatalogCategoryNavOption = MarketingCatalogFacetNavOption & {parentId: string | null}

export type MarketingCatalogFacetsNav = {
  categories: MarketingCatalogCategoryNavOption[]
  brands: MarketingCatalogFacetNavOption[]
  colors: MarketingCatalogFacetNavOption[]
  sizes: MarketingCatalogFacetNavOption[]
}

/** Payload grille catalogue (après signature des couvertures). */
export type MarketingCatalogGridItem = {
  id: string
  title: string
  brand_label: string | null
  category_label: string | null
  color_label: string | null
  size_label: string | null
  price_points: number | null
  item_category_id: string | null
  item_brand_id: string | null
  item_couleur_id: string | null
  item_size_id: string | null
  coverUrl: string | null
  objectPosition?: string
  displayTitle?: string
  displaySubtitle?: string | null
}

export type MarketingCatalogItemRow = {
  id: string
  title: string
  description: string | null
  price_points: number | null
  status: string
  photos: unknown
  item_category_id: string | null
  item_size_id: string | null
  item_brand_id: string | null
  item_couleur_id: string | null
  item_materiaux_id: string | null
  category_label: string | null
  size_label: string | null
  materials_label: string | null
  color_label: string | null
  brand_label: string | null
  condition_label: string | null
  condition_score: string | null
}

const SIGNED_TTL_SEC = 60 * 60 * 24

function parseFacetOptions(raw: unknown): MarketingCatalogFacetOption[] {
  if (!Array.isArray(raw)) return []
  const out: MarketingCatalogFacetOption[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as {id?: unknown; label?: unknown}
    const id = typeof o.id === 'string' ? o.id : null
    const label = typeof o.label === 'string' ? o.label.trim() : ''
    if (id && label) out.push({id, label})
  }
  return out
}

export async function fetchMarketingCatalogFacets(): Promise<MarketingCatalogFacets | null> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const {data, error} = await supabase.rpc('get_marketing_website_catalog_facets')
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog] facets', error.message)
    }
    return null
  }
  const root = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  return {
    categories: parseFacetOptions(root.categories),
    brands: parseFacetOptions(root.brands),
    colors: parseFacetOptions(root.colors),
    sizes: parseFacetOptions(root.sizes),
  }
}

function navOptionsFromBase(
  opts: MarketingCatalogFacetOption[],
  slugForId: (id: string, label: string) => string,
): MarketingCatalogFacetNavOption[] {
  const raw = opts.map((o) => ({...o, slug: slugForId(o.id, o.label)}))
  return withUniqueSlugs(raw)
}

/** Facettes + slugs URL (marques = slug base ; catégories / couleurs / tailles = slugify du libellé). */
export async function fetchMarketingCatalogFacetsNav(): Promise<MarketingCatalogFacetsNav | null> {
  const [base, supabase] = await Promise.all([fetchMarketingCatalogFacets(), Promise.resolve(getSupabaseServiceRoleClient())])
  if (!base || !supabase) return null

  const [{data: brandRows}, {data: catRows}] = await Promise.all([
    supabase.from('item_brands').select('id, slug'),
    supabase.from('item_categories').select('id, name, parent_category_id'),
  ])

  const brandSlugById = new Map<string, string>()
  if (Array.isArray(brandRows)) {
    for (const row of brandRows) {
      if (row && typeof row === 'object' && typeof (row as {id?: unknown}).id === 'string') {
        const id = (row as {id: string}).id
        const slug = typeof (row as {slug?: unknown}).slug === 'string' ? (row as {slug: string}).slug.trim() : ''
        if (slug) brandSlugById.set(id, slugifyFr(slug))
      }
    }
  }

  const categorySlugById = new Map<string, string>()
  if (Array.isArray(catRows)) {
    for (const row of catRows) {
      if (row && typeof row === 'object' && typeof (row as {id?: unknown}).id === 'string') {
        const id = (row as {id: string}).id
        const name = typeof (row as {name?: unknown}).name === 'string' ? (row as {name: string}).name : ''
        if (name.trim()) categorySlugById.set(id, slugifyFr(name.trim()))
      }
    }
  }

  const brandSlug = (id: string, label: string) => brandSlugById.get(id) ?? slugifyFr(label)
  const categorySlug = (id: string, label: string) => categorySlugById.get(id) ?? slugifyFr(label)
  const labelSlug = (_id: string, label: string) => slugifyFr(label)

  const categoryNavRaw: MarketingCatalogCategoryNavOption[] = []
  if (Array.isArray(catRows)) {
    for (const row of catRows) {
      if (!row || typeof row !== 'object') continue
      const id = typeof (row as {id?: unknown}).id === 'string' ? (row as {id: string}).id : null
      const name = typeof (row as {name?: unknown}).name === 'string' ? (row as {name: string}).name.trim() : ''
      if (!id || !name) continue
      const rawParent = (row as {parent_category_id?: unknown}).parent_category_id
      const parentId =
        typeof rawParent === 'string' && rawParent.trim() ? rawParent.trim() : null
      categoryNavRaw.push({
        id,
        label: name,
        slug: categorySlug(id, name),
        parentId,
      })
    }
  }

  return {
    categories: withUniqueSlugs(categoryNavRaw),
    brands: navOptionsFromBase(base.brands, brandSlug),
    colors: navOptionsFromBase(base.colors, labelSlug),
    sizes: navOptionsFromBase(base.sizes, labelSlug),
  }
}

export async function fetchMarketingCatalogItemsPage(params: {
  limit: number
  offset: number
  sort: CatalogSortMode
  categoryId?: string | null
  categoryIds?: string[] | null
  brandIds: string[]
  colorIds: string[]
  sizeIds: string[]
}): Promise<{items: MarketingCatalogItemRow[]; total: number}> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return {items: [], total: 0}

  const fromArray = params.categoryIds?.filter((x) => typeof x === 'string' && x.trim()) ?? []
  const fromLegacy =
    params.categoryId && typeof params.categoryId === 'string' && params.categoryId.trim()
      ? [params.categoryId.trim()]
      : []
  const catIds = fromArray.length > 0 ? fromArray : fromLegacy

  /** Sans `p_category_ids` dans l’appel, PostgREST cible encore la RPC 7 paramètres si la migration n’est pas appliquée. */
  const rpcArgs: Record<string, unknown> = {
    p_limit: params.limit,
    p_offset: params.offset,
    p_sort: params.sort,
    p_category_id: catIds.length === 1 ? catIds[0]! : null,
    p_brand_ids: params.brandIds.length > 0 ? params.brandIds : null,
    p_couleur_ids: params.colorIds.length > 0 ? params.colorIds : null,
    p_size_ids: params.sizeIds.length > 0 ? params.sizeIds : null,
  }
  if (catIds.length > 1) {
    rpcArgs.p_category_id = null
    rpcArgs.p_category_ids = catIds
  }

  const {data, error} = await supabase.rpc('get_marketing_website_catalog_items_page', rpcArgs)
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog] page', error.message)
    }
    return {items: [], total: 0}
  }
  const root = data && typeof data === 'object' && !Array.isArray(data) ? (data as {items?: unknown; total?: unknown}) : {}
  const items = parseMarketingCatalogRpcPayload(data)
  const totalNum = Number(root.total)
  const total = Number.isFinite(totalNum) ? totalNum : 0
  return {items, total}
}

export async function gridItemsFromRows(
  supabase: StorageSignClient,
  rows: MarketingCatalogItemRow[],
): Promise<MarketingCatalogGridItem[]> {
  const covers = await resolveCoverUrlsForItems(supabase, rows)
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    brand_label: r.brand_label,
    category_label: r.category_label,
    color_label: r.color_label,
    size_label: r.size_label,
    price_points: r.price_points,
    item_category_id: r.item_category_id,
    item_brand_id: r.item_brand_id,
    item_couleur_id: r.item_couleur_id,
    item_size_id: r.item_size_id,
    coverUrl: covers.get(r.id) ?? null,
  }))
}

function parseMarketingCatalogRpcPayload(data: unknown): MarketingCatalogItemRow[] {
  const root = data && typeof data === 'object' && !Array.isArray(data) ? (data as {items?: unknown}) : {}
  const raw = root.items
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (row): row is MarketingCatalogItemRow =>
      Boolean(row) &&
      typeof row === 'object' &&
      typeof (row as MarketingCatalogItemRow).id === 'string' &&
      typeof (row as MarketingCatalogItemRow).title === 'string',
  )
}

export async function fetchMarketingCatalogItemsByIds(
  itemIds: string[],
): Promise<MarketingCatalogItemRow[]> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase || itemIds.length === 0) return []

  const {data, error} = await supabase.rpc('get_marketing_website_catalog_items_by_ids', {
    p_item_ids: itemIds,
  })
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog]', error.message)
    }
    return []
  }
  return parseMarketingCatalogRpcPayload(data)
}

/** Liste catalogue public (site marketing), jusqu’à 500 pièces côté SQL. */
export async function fetchMarketingCatalogItemsFull(limit = 200): Promise<MarketingCatalogItemRow[]> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return []

  const {data, error} = await supabase.rpc('get_marketing_website_catalog_items', {
    p_limit: limit,
  })
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog] get_marketing_website_catalog_items', error.message)
    }
    return []
  }
  return parseMarketingCatalogRpcPayload(data)
}

export async function resolveCoverUrlsForItems(
  supabase: StorageSignClient,
  rows: MarketingCatalogItemRow[],
  chunkSize = 14,
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize)
    const pairs = await Promise.all(
      slice.map(async (r) => {
        const url = await resolveItemCoverSignedUrl(supabase, r.photos)
        return [r.id, url] as const
      }),
    )
    for (const [id, url] of pairs) map.set(id, url)
  }
  return map
}

export async function signPhotoPaths(
  supabase: StorageSignClient,
  paths: string[],
): Promise<(string | null)[]> {
  const out: (string | null)[] = []
  for (const p of paths) {
    out.push(await createSignedUrlForStoragePath(supabase, p, SIGNED_TTL_SEC))
  }
  return out
}

export async function resolveItemCoverSignedUrl(
  supabase: StorageSignClient,
  photos: unknown,
): Promise<string | null> {
  const first = getFirstPhotoStoragePath(photos)
  if (!first) return null
  return createSignedUrlForStoragePath(supabase, first, SIGNED_TTL_SEC)
}

export async function resolveItemGallerySignedUrls(
  supabase: StorageSignClient,
  photos: unknown,
): Promise<string[]> {
  const paths = collectPhotoPathsFromItemPhotos(photos)
  const signed = await signPhotoPaths(supabase, paths)
  return signed.filter((u): u is string => Boolean(u))
}

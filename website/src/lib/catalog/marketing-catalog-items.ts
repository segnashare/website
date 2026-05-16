import {idsForCatalogRpc} from '@/lib/catalog/catalog-facet-scope-ids'
import {mergeCategoriesNavWithScopedPresence} from '@/lib/catalog/catalog-scoped-facets'
import {catalogPerfDetail, catalogPerfLog, catalogPerfNow} from '@/lib/catalog/catalog-perf'
import type {CatalogPathResolved} from '@/lib/catalog/catalog-path-types'
import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {slugifyFr, withUniqueSlugs} from '@/lib/catalog/catalog-slugs'
import {
  collectPhotoPathsFromItemPhotos,
  collectPhotoSlotsFromItemPhotos,
  getFirstPhotoCoverMeta,
  getFirstPhotoStoragePath,
  type ItemPhotoCoverPosition,
} from '@/lib/catalog/item-photos'
import {createSignedUrlForStoragePath, type StorageSignClient} from '@/lib/catalog/storage-signed-url'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import type {SupabaseClient} from '@supabase/supabase-js'
import {unstable_cache} from 'next/cache'
import {cache} from 'react'

export type CatalogSortMode = 'recent' | 'price_asc' | 'price_desc'

export type MarketingCatalogFacetOption = {
  id: string
  label: string
  /** `public.sizes.code` (ex. `shoes:38`, `bottom:38`) — absent si RPC ancienne. */
  code?: string
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
  /** Aligné sur le payload RPC marketing (`size_code`). */
  size_code?: string | null
  coverUrl: string | null
  /** Cadrage BO / app (`items.photos` → `position`). */
  coverPosition?: ItemPhotoCoverPosition | null
  /** Point focal Sanity (sections CMS éditoriales). */
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
  size_code?: string | null
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
    const o = row as {id?: unknown; label?: unknown; code?: unknown}
    const id = typeof o.id === 'string' ? o.id : null
    const label = typeof o.label === 'string' ? o.label.trim() : ''
    const codeRaw = typeof o.code === 'string' ? o.code.trim() : ''
    if (id && label) out.push({id, label, ...(codeRaw ? {code: codeRaw} : {})})
  }
  return out
}

/**
 * Complète `sizes.code` depuis `public.sizes` lorsque la RPC facettes n’expose pas encore le code
 * (migrations marketing avant `20260821110000_*`). Sans ça, le rail « Pointures » reste vide.
 */
async function enrichFacetSizesWithCodesFromSizesTable(
  supabase: SupabaseClient,
  sizes: MarketingCatalogFacetOption[],
): Promise<MarketingCatalogFacetOption[]> {
  if (sizes.length === 0) return sizes
  const ids = [...new Set(sizes.map((s) => s.id).filter((id) => typeof id === 'string' && id.length > 0))]
  if (ids.length === 0) return sizes

  const byId = new Map<string, string>()
  const chunk = 120
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk)
    const {data, error} = await supabase.from('sizes').select('id, code').in('id', slice)
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[marketing-catalog] enrich facet sizes from table', error.message)
      }
      continue
    }
    for (const row of data ?? []) {
      const id = typeof row.id === 'string' ? row.id : null
      const code = typeof row.code === 'string' ? row.code.trim() : ''
      if (id && code) byId.set(id, code)
    }
  }
  if (byId.size === 0) return sizes

  return sizes.map((s) => {
    const fromRpc = s.code?.trim()
    const fromTable = byId.get(s.id)
    const code = (fromRpc && fromRpc.length > 0 ? fromRpc : fromTable) ?? ''
    return code ? {...s, code} : s
  })
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
  const sizes = parseFacetOptions(root.sizes)
  return {
    categories: parseFacetOptions(root.categories),
    brands: parseFacetOptions(root.brands),
    colors: parseFacetOptions(root.colors),
    sizes: await enrichFacetSizesWithCodesFromSizesTable(supabase, sizes),
  }
}

function navOptionsFromBase(
  opts: MarketingCatalogFacetOption[],
  slugForId: (id: string, label: string) => string,
): MarketingCatalogFacetNavOption[] {
  const raw = opts.map((o) => ({...o, slug: slugForId(o.id, o.label)}))
  return withUniqueSlugs(raw)
}

function parseFacetsRpcPayload(data: unknown): MarketingCatalogFacets | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const root = data as Record<string, unknown>
  return {
    categories: parseFacetOptions(root.categories),
    brands: parseFacetOptions(root.brands),
    colors: parseFacetOptions(root.colors),
    sizes: parseFacetOptions(root.sizes),
  }
}

/**
 * Facettes « globales » : résolution d’URL (slugs) + arbre catégories complet.
 * Ne pas utiliser seule pour les rails filtres (voir `fetchMarketingCatalogBrowseFacetsNav`).
 */
async function fetchMarketingCatalogPathResolveNavUncached(): Promise<MarketingCatalogFacetsNav | null> {
  const t0 = catalogPerfNow()
  const [base, supabase] = await Promise.all([fetchMarketingCatalogFacets(), Promise.resolve(getSupabaseServiceRoleClient())])
  const tAfterBase = catalogPerfNow()
  if (!base || !supabase) return null

  const [{data: brandRows}, {data: catRows}] = await Promise.all([
    supabase.from('item_brands').select('id, slug'),
    supabase.from('item_categories').select('id, name, parent_category_id'),
  ])
  const tAfterTables = catalogPerfNow()

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

  const out: MarketingCatalogFacetsNav = {
    categories: withUniqueSlugs(categoryNavRaw),
    brands: navOptionsFromBase(base.brands, brandSlug),
    colors: navOptionsFromBase(base.colors, labelSlug),
    sizes: navOptionsFromBase(base.sizes, labelSlug),
  }
  if (catalogPerfDetail()) {
    catalogPerfLog('fetchMarketingCatalogPathResolveNav', {
      totalMs: Math.round(catalogPerfNow() - t0),
      baseRpcMs: Math.round(tAfterBase - t0),
      tablesMs: Math.round(tAfterTables - tAfterBase),
      buildMs: Math.round(catalogPerfNow() - tAfterTables),
      categoriesCount: out.categories.length,
      brandsCount: out.brands.length,
    })
  }
  return out
}

const fetchMarketingCatalogPathResolveNavCrossRequest = unstable_cache(
  fetchMarketingCatalogPathResolveNavUncached,
  ['marketing_catalog_path_nav_v2'],
  {revalidate: 30},
)

/** Dédup par rendu RSC + cache entre requêtes (résolution de chemin / slugs). */
export const fetchMarketingCatalogPathResolveNav = cache(fetchMarketingCatalogPathResolveNavCrossRequest)

type FacetsScopedRpcPayload = {
  p_brand_ids: string[] | null
  p_category_id: string | null
  p_category_ids: string[] | null
  p_color_ids: string[] | null
  p_size_ids: string[] | null
}

function facetsScopedRpcPayloadFromScope(scope: {
  brandIds: string[]
  categoryIds: string[]
  colorIds: string[]
  sizeIds: string[]
}): FacetsScopedRpcPayload {
  return {
    p_brand_ids: scope.brandIds.length > 0 ? scope.brandIds : null,
    p_category_id: scope.categoryIds.length === 1 ? scope.categoryIds[0]! : null,
    p_category_ids: scope.categoryIds.length > 1 ? scope.categoryIds : null,
    p_color_ids: scope.colorIds.length > 0 ? scope.colorIds : null,
    p_size_ids: scope.sizeIds.length > 0 ? scope.sizeIds : null,
  }
}

function facetsScopedRpcCacheKey(p: FacetsScopedRpcPayload): string {
  return JSON.stringify({
    b: [...(p.p_brand_ids ?? [])].sort(),
    c1: p.p_category_id,
    cN: [...(p.p_category_ids ?? [])].sort(),
    co: [...(p.p_color_ids ?? [])].sort(),
    s: [...(p.p_size_ids ?? [])].sort(),
  })
}

/** Résultat brut facettes scopées (même `revalidate` que le path nav). */
const getMarketingCatalogFacetsScopedPayload = unstable_cache(
  async (scopeKey: string) => {
    const payload = JSON.parse(scopeKey) as FacetsScopedRpcPayload
    const supabase = getSupabaseServiceRoleClient()
    if (!supabase) return null
    const {data, error} = await supabase.rpc('get_marketing_website_catalog_facets_scoped', {
      p_brand_ids: payload.p_brand_ids,
      p_category_id: payload.p_category_id,
      p_category_ids: payload.p_category_ids,
      p_color_ids: payload.p_color_ids,
      p_size_ids: payload.p_size_ids,
    })
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[marketing-catalog] facets_scoped', error.message)
      }
      return null
    }
    const parsed = parseFacetsRpcPayload(data)
    if (!parsed) return null
    return {
      ...parsed,
      sizes: await enrichFacetSizesWithCodesFromSizesTable(supabase, parsed.sizes),
    }
  },
  ['marketing_catalog_facets_scoped_payload_v2'],
  {revalidate: 30},
)

async function fetchMarketingCatalogBrowseFacetsNavUncached(
  pathNav: MarketingCatalogFacetsNav,
  resolved: CatalogPathResolved,
  query: CatalogBrowseQuery,
): Promise<MarketingCatalogFacetsNav> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return pathNav

  const scope = idsForCatalogRpc(resolved, query, pathNav)
  const rpcPayload = facetsScopedRpcPayloadFromScope(scope)
  const scopeKey = facetsScopedRpcCacheKey(rpcPayload)

  const t0 = catalogPerfNow()
  const scoped = await getMarketingCatalogFacetsScopedPayload(scopeKey)
  if (!scoped) return pathNav

  if (catalogPerfDetail()) {
    catalogPerfLog('fetchMarketingCatalogBrowseFacetsNav', {
      rpcMs: Math.round(catalogPerfNow() - t0),
      scopedCategoryCount: scoped.categories.length,
    })
  }

  const mergedCats = mergeCategoriesNavWithScopedPresence(pathNav.categories, scoped.categories)
  const brandSlug = (id: string, label: string) => pathNav.brands.find((b) => b.id === id)?.slug ?? slugifyFr(label)
  const labelSlug = (_id: string, label: string) => slugifyFr(label)

  return {
    categories: mergedCats,
    brands: navOptionsFromBase(scoped.brands, brandSlug),
    colors: navOptionsFromBase(scoped.colors, labelSlug),
    sizes: navOptionsFromBase(scoped.sizes, labelSlug),
  }
}

/** Rails latéraux : options restreintes au périmètre courant (marque, catégorie, filtres query). */
export const fetchMarketingCatalogBrowseFacetsNav = cache(fetchMarketingCatalogBrowseFacetsNavUncached)

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

  /**
   * Toujours envoyer `p_category_ids` (même `null`) : si les deux RPC 7 et 8 args coexistent en base,
   * PostgREST ne peut pas choisir — la migration `20260530120000_*` ne garde que la 8e forme.
   */
  const rpcArgs: Record<string, unknown> = {
    p_limit: params.limit,
    p_offset: params.offset,
    p_sort: params.sort,
    p_category_id: catIds.length === 1 ? catIds[0]! : null,
    p_category_ids: catIds.length > 1 ? catIds : null,
    p_brand_ids: params.brandIds.length > 0 ? params.brandIds : null,
    p_couleur_ids: params.colorIds.length > 0 ? params.colorIds : null,
    p_size_ids: params.sizeIds.length > 0 ? params.sizeIds : null,
  }

  const tRpc0 = catalogPerfNow()
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
  if (catalogPerfDetail()) {
    catalogPerfLog('fetchMarketingCatalogItemsPage', {
      rpcMs: Math.round(catalogPerfNow() - tRpc0),
      rowCount: items.length,
      total,
    })
  }
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
    size_code: r.size_code ?? null,
    coverUrl: covers.get(r.id) ?? null,
    coverPosition: getFirstPhotoCoverMeta(r.photos)?.position ?? null,
  }))
}

export type MarketingCatalogGallerySlot = {
  url: string
  position: ItemPhotoCoverPosition | null
}

export async function resolveItemGallerySlots(
  supabase: StorageSignClient,
  photos: unknown,
): Promise<MarketingCatalogGallerySlot[]> {
  const slots = collectPhotoSlotsFromItemPhotos(photos)
  if (slots.length === 0) {
    const paths = collectPhotoPathsFromItemPhotos(photos)
    const signed = await signPhotoPaths(supabase, paths)
    return signed
      .filter((u): u is string => Boolean(u))
      .map((url) => ({url, position: null}))
  }

  const out: MarketingCatalogGallerySlot[] = []
  for (const slot of slots) {
    const url = await createSignedUrlForStoragePath(supabase, slot.storagePath, SIGNED_TTL_SEC)
    if (url) out.push({url, position: slot.position})
  }
  return out
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

/** Au-delà, on découpe pour éviter des centaines de `createSignedUrl` simultanés (sections CMS volumineuses). */
const COVER_SIGN_ALL_PARALLEL_MAX = 56

export async function resolveCoverUrlsForItems(
  supabase: StorageSignClient,
  rows: MarketingCatalogItemRow[],
  /** Taille des lots si `rows.length` dépasse `COVER_SIGN_ALL_PARALLEL_MAX`. */
  chunkSize = 40,
): Promise<Map<string, string | null>> {
  const t0 = catalogPerfNow()
  const map = new Map<string, string | null>()

  async function signRow(r: MarketingCatalogItemRow): Promise<readonly [string, string | null]> {
    const url = await resolveItemCoverSignedUrl(supabase, r.photos)
    return [r.id, url] as const
  }

  if (rows.length <= COVER_SIGN_ALL_PARALLEL_MAX) {
    const pairs = await Promise.all(rows.map((r) => signRow(r)))
    for (const [id, url] of pairs) map.set(id, url)
  } else {
    for (let i = 0; i < rows.length; i += chunkSize) {
      const slice = rows.slice(i, i + chunkSize)
      const pairs = await Promise.all(slice.map((r) => signRow(r)))
      for (const [id, url] of pairs) map.set(id, url)
    }
  }

  if (catalogPerfDetail()) {
    const batches =
      rows.length <= COVER_SIGN_ALL_PARALLEL_MAX
        ? 1
        : Math.ceil(rows.length / chunkSize) || 0
    catalogPerfLog('resolveCoverUrlsForItems', {
      totalMs: Math.round(catalogPerfNow() - t0),
      rowCount: rows.length,
      chunkSize: rows.length <= COVER_SIGN_ALL_PARALLEL_MAX ? rows.length || chunkSize : chunkSize,
      batches,
    })
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

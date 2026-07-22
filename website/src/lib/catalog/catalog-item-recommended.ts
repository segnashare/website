import {isUniqueSizeToken} from '@/lib/catalog/format-catalog-card-size'
import {
  fetchMarketingCatalogItemsPage,
  gridItemsFromRows,
  type MarketingCatalogGridItem,
  type MarketingCatalogItemRow,
} from '@/lib/catalog/marketing-catalog-items'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import type {SupabaseClient} from '@supabase/supabase-js'

/** 2 rangées × 6 colonnes sur desktop. */
const RECOMMENDED_LIMIT = 12
/** Pool plus large pour mélanger catégories / pièces. */
const RECOMMENDED_FETCH = 60
/** Minimum affiché — complète avec taille unique puis le reste du catalogue. */
const RECOMMENDED_MIN = 6

function sizeCodeToken(code: string | null | undefined): string {
  const raw = typeof code === 'string' ? code.trim().toLowerCase() : ''
  if (!raw) return ''
  return raw.includes(':') ? raw.slice(raw.lastIndexOf(':') + 1) : raw
}

function normalizeSizeKey(label: string | null | undefined, code: string | null | undefined): string {
  const token = sizeCodeToken(code)
  if (token && isUniqueSizeToken(token)) return 'tu'
  if (token) return token
  const labelRaw = typeof label === 'string' ? label.trim().toLowerCase() : ''
  if (!labelRaw || isUniqueSizeToken(labelRaw)) return 'tu'
  return labelRaw
}

function isUniqueSizeRow(row: MarketingCatalogItemRow): boolean {
  if (!row.item_size_id) return true
  const label = typeof row.size_label === 'string' ? row.size_label : ''
  const code = typeof row.size_code === 'string' ? row.size_code : ''
  if (label && isUniqueSizeToken(label)) return true
  if (code && isUniqueSizeToken(code)) return true
  if (!label && !code) return true
  return false
}

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items]
  let state = hashSeed(seed) || 1
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

type SizeRow = {id: string; code: string | null; label: string | null}

/**
 * IDs de tailles à inclure : même « pointure / lettre » toutes catégories
 * + toutes les tailles uniques (TU / OS / Taille unique).
 */
async function resolveRecommendedSizeIds(
  supabase: SupabaseClient,
  params: {sizeId: string | null; sizeLabel: string | null; sizeCode: string | null},
): Promise<string[]> {
  const {data, error} = await supabase.from('sizes').select('id, code, label')
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[catalog-recommended] sizes', error.message)
    }
    return params.sizeId ? [params.sizeId] : []
  }

  const rows = ((data ?? []) as SizeRow[]).filter((r) => typeof r.id === 'string' && r.id.length > 0)
  if (rows.length === 0) return params.sizeId ? [params.sizeId] : []

  const targetKey = normalizeSizeKey(params.sizeLabel, params.sizeCode)
  const ids = new Set<string>()

  if (params.sizeId) ids.add(params.sizeId)

  for (const row of rows) {
    const key = normalizeSizeKey(row.label, row.code)
    if (key === 'tu' || key === targetKey) ids.add(row.id)
  }

  return [...ids]
}

async function fetchRecommendedPool(params: {
  sizeIds: string[]
  excludeItemId: string
}): Promise<MarketingCatalogItemRow[]> {
  const page = await fetchMarketingCatalogItemsPage({
    limit: Math.min(RECOMMENDED_FETCH, 100),
    offset: 0,
    sort: 'recent',
    categoryIds: [],
    brandIds: [],
    colorIds: [],
    sizeIds: params.sizeIds,
  })
  return page.items.filter((row) => row.id !== params.excludeItemId)
}

/**
 * Complète le pool si trop peu de pièces même taille / TU :
 * d’abord tailles uniques (y compris size_id null), puis le reste du catalogue.
 */
function fillRecommendedCandidates(
  primary: MarketingCatalogItemRow[],
  fallback: MarketingCatalogItemRow[],
  seed: string,
): MarketingCatalogItemRow[] {
  const seen = new Set(primary.map((r) => r.id))
  const unused = fallback.filter((r) => !seen.has(r.id))

  const uniqueFill = seededShuffle(
    unused.filter(isUniqueSizeRow),
    `${seed}:tu`,
  )
  const otherFill = seededShuffle(
    unused.filter((r) => !isUniqueSizeRow(r)),
    `${seed}:other`,
  )

  const out = [...primary]
  for (const row of [...uniqueFill, ...otherFill]) {
    if (out.length >= RECOMMENDED_LIMIT) break
    out.push(row)
  }
  return out
}

/** Pièces proches : même taille (+ tailles uniques), toutes catégories, ordre mélangé. */
export async function loadCatalogItemRecommended(params: {
  excludeItemId: string
  sizeId: string | null
  sizeLabel?: string | null
  sizeCode?: string | null
}): Promise<MarketingCatalogGridItem[]> {
  const sizeId = params.sizeId?.trim() || null
  const sizeLabel = params.sizeLabel?.trim() || null
  const sizeCode = params.sizeCode?.trim() || null

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return []

  const sizeIds = await resolveRecommendedSizeIds(supabase, {sizeId, sizeLabel, sizeCode})

  const primary =
    sizeIds.length > 0
      ? await fetchRecommendedPool({sizeIds, excludeItemId: params.excludeItemId})
      : []

  let candidates = primary

  if (candidates.length < Math.max(RECOMMENDED_MIN, RECOMMENDED_LIMIT)) {
    const fallback = await fetchRecommendedPool({
      sizeIds: [],
      excludeItemId: params.excludeItemId,
    })
    candidates = fillRecommendedCandidates(primary, fallback, params.excludeItemId)
  }

  if (candidates.length === 0) return []

  const shuffled = seededShuffle(candidates, params.excludeItemId).slice(0, RECOMMENDED_LIMIT)
  return gridItemsFromRows(supabase, shuffled)
}

import type {CatalogSortMode} from '@/lib/catalog/marketing-catalog-items'
import {slugifyFr} from '@/lib/catalog/catalog-slugs'

export type CatalogBrowseQuery = {
  page: number
  sort: CatalogSortMode
  colorSlugs: string[]
  sizeSlugs: string[]
  /** Équivalent ancien 1er segment d’URL (`/catalogue/nike` → `?segment=nike`). */
  segmentSlug: string | null
  /** Équivalent 2e segment (`/catalogue/nike/robes` → `?segment=nike&categorie=robes`). */
  subSlug: string | null
}

const SORT_TO_QUERY: Record<CatalogSortMode, string> = {
  recent: 'nouveautes',
  price_asc: 'prix-croissant',
  price_desc: 'prix-decroissant',
}

const QUERY_TO_SORT = new Map<string, CatalogSortMode>([
  ['nouveautes', 'recent'],
  ['recent', 'recent'],
  ['nouvelle', 'recent'],
  ['nouvelles', 'recent'],
  ['popularite', 'recent'],
  ['popularité', 'recent'],
  ['prix-croissant', 'price_asc'],
  ['prix-croissant-', 'price_asc'],
  ['prix-decroissant', 'price_desc'],
  ['price_asc', 'price_asc'],
  ['price_desc', 'price_desc'],
])

function firstParam(sp: URLSearchParams, keys: string[]): string | null {
  for (const k of keys) {
    const v = sp.get(k)
    if (v?.trim()) return v.trim()
  }
  return null
}

function splitList(raw: string | null): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((s) => slugifyFr(s.replace(/\+/g, ' ')))
    .filter((s) => s && s !== 'x')
}

export function parseCatalogBrowseQueryFromNext(raw: Record<string, string | string[] | undefined>): CatalogBrowseQuery {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x) sp.append(k, x)
      }
    } else if (v) {
      sp.set(k, v)
    }
  }
  return parseCatalogBrowseQuery(sp)
}

export function parseSortParam(raw: string | null | undefined): CatalogSortMode {
  const sortRaw = (raw || 'nouveautes').trim().toLowerCase()
  return QUERY_TO_SORT.get(sortRaw) ?? 'recent'
}

export function parseCatalogBrowseQuery(sp: URLSearchParams): CatalogBrowseQuery {
  const pageRaw = sp.get('page')
  const page = Math.max(1, Number.parseInt(pageRaw || '1', 10) || 1)

  const sortRaw = firstParam(sp, ['sort', 'tri'])
  const sort = parseSortParam(sortRaw)

  const colorsRaw = firstParam(sp, ['colors', 'couleurs', 'color'])
  const sizesRaw = firstParam(sp, ['sizes', 'tailles', 'size'])

  const colorSlugs = splitList(colorsRaw)
  const sizeSlugs = splitList(sizesRaw)

  const segmentRaw = firstParam(sp, ['segment', 'marque'])
  const subRaw = firstParam(sp, ['categorie', 'sous-categorie'])
  const segmentSlug = segmentRaw ? slugifyFr(segmentRaw) : null
  const subSlug = subRaw ? slugifyFr(subRaw) : null

  return {page, sort, colorSlugs, sizeSlugs, segmentSlug, subSlug}
}

export function serializeCatalogBrowseQuery(q: CatalogBrowseQuery): URLSearchParams {
  const out = new URLSearchParams()
  if (q.page > 1) out.set('page', String(q.page))
  const sortQ = SORT_TO_QUERY[q.sort]
  if (sortQ !== 'nouveautes') out.set('sort', sortQ)
  if (q.colorSlugs.length > 0) out.set('colors', q.colorSlugs.join(','))
  if (q.sizeSlugs.length > 0) out.set('sizes', q.sizeSlugs.join(','))
  if (q.segmentSlug) out.set('segment', q.segmentSlug)
  if (q.subSlug) out.set('categorie', q.subSlug)
  return out
}

export function mergePathAndQuery(pathname: string, q: CatalogBrowseQuery): string {
  const sp = serializeCatalogBrowseQuery(q)
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

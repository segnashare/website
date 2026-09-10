import type {CatalogSortMode} from '@/lib/catalog/marketing-catalog-items'
import {slugifyFr} from '@/lib/catalog/catalog-slugs'

export type CatalogBrowseQuery = {
  page: number
  sort: CatalogSortMode
  colorSlugs: string[]
  sizeSlugs: string[]
  /** `disponible` | `reserve` | `vendu` */
  availabilitySlugs: string[]
  /** Multi-sélection catégories (`?categories=vetements,sacs`). */
  categorySlugs: string[]
  /** Multi-sélection marques (`?brands=nike,ganni`). */
  brandSlugs: string[]
  /** Équivalent ancien 1er segment d’URL (`/catalogue/nike` → `?segment=nike`). */
  segmentSlug: string | null
  /** Équivalent 2e segment (`/catalogue/nike/robes` → `?segment=nike&categorie=robes`). */
  subSlug: string | null
  /** Filtre sélection « New » (badge nouveautés, ~20 % plus récents). */
  newOnly: boolean
  /** Filtre tag catalogue (`tags.slug`, ex. `summer2026`). */
  tagSlug: string | null
  /** Multi-sélection tags (`?tags=summer,resort`). */
  tagSlugs: string[]
  /** Multi-sélection matériaux (`?materiaux=soie,laine`). */
  materialSlugs: string[]
  /** Ciblage éditorial CMS (`?look=nouveautes`). */
  lookSlug: string | null
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
  const availabilityRaw = firstParam(sp, ['disponibilite', 'availability', 'dispo'])
  const categoriesRaw = firstParam(sp, ['categories'])
  const brandsRaw = firstParam(sp, ['brands', 'marques'])

  const colorSlugs = splitList(colorsRaw)
  const sizeSlugs = splitList(sizesRaw)
  const availabilitySlugs = splitList(availabilityRaw)
  const categorySlugs = splitList(categoriesRaw)
  const brandSlugs = splitList(brandsRaw)

  const segmentRaw = firstParam(sp, ['segment', 'marque'])
  const subRaw = firstParam(sp, ['categorie', 'sous-categorie'])
  const segmentSlug = segmentRaw ? slugifyFr(segmentRaw) : null
  const subSlug = subRaw ? slugifyFr(subRaw) : null

  const newRaw = firstParam(sp, ['new', 'nouveautes', 'selection'])
  const newOnly =
    newRaw === '1' ||
    newRaw === 'true' ||
    newRaw === 'yes' ||
    newRaw === 'nouveautes' ||
    newRaw === 'new'

  const tagRaw = firstParam(sp, ['tag'])
  const tagsRaw = firstParam(sp, ['tags'])
  const tagSlugs = [
    ...new Set([
      ...splitList(tagsRaw),
      ...(tagRaw && !tagRaw.includes(',') ? [slugifyFr(tagRaw.replace(/\+/g, ' '))] : splitList(tagRaw)),
    ]),
  ].filter((s) => s && s !== 'x')
  const tagSlug = tagSlugs[0] ?? null

  const materialsRaw = firstParam(sp, ['materiaux', 'materials', 'matieres'])
  const materialSlugs = splitList(materialsRaw)

  const lookRaw = firstParam(sp, ['look', 'cible'])
  const lookSlug = lookRaw ? slugifyFr(lookRaw.replace(/\+/g, ' ')) : null

  return {
    page,
    sort,
    colorSlugs,
    sizeSlugs,
    availabilitySlugs,
    categorySlugs,
    brandSlugs,
    segmentSlug,
    subSlug,
    newOnly,
    tagSlug,
    tagSlugs,
    materialSlugs,
    lookSlug,
  }
}

/** Normalise une query (champs manquants / ISR ancien payload). */
export function normalizeCatalogBrowseQuery(q: Partial<CatalogBrowseQuery> | CatalogBrowseQuery): CatalogBrowseQuery {
  return {
    page: Math.max(1, Number(q.page) || 1),
    sort: q.sort === 'price_asc' || q.sort === 'price_desc' || q.sort === 'recent' ? q.sort : 'recent',
    colorSlugs: Array.isArray(q.colorSlugs) ? q.colorSlugs : [],
    sizeSlugs: Array.isArray(q.sizeSlugs) ? q.sizeSlugs : [],
    availabilitySlugs: Array.isArray(q.availabilitySlugs) ? q.availabilitySlugs : [],
    categorySlugs: Array.isArray(q.categorySlugs)
      ? [...new Set(q.categorySlugs.filter((s) => typeof s === 'string' && s.trim()))].sort()
      : [],
    brandSlugs: Array.isArray(q.brandSlugs)
      ? [...new Set(q.brandSlugs.filter((s) => typeof s === 'string' && s.trim()))].sort()
      : [],
    segmentSlug: typeof q.segmentSlug === 'string' && q.segmentSlug.trim() ? q.segmentSlug.trim() : null,
    subSlug: typeof q.subSlug === 'string' && q.subSlug.trim() ? q.subSlug.trim() : null,
    newOnly: Boolean(q.newOnly),
    tagSlug: typeof q.tagSlug === 'string' && q.tagSlug.trim() ? q.tagSlug.trim() : null,
    tagSlugs: Array.isArray(q.tagSlugs)
      ? [...new Set(q.tagSlugs.filter((s) => typeof s === 'string' && s.trim()))].sort()
      : typeof q.tagSlug === 'string' && q.tagSlug.trim()
        ? [q.tagSlug.trim()]
        : [],
    materialSlugs: Array.isArray(q.materialSlugs)
      ? [...new Set(q.materialSlugs.filter((s) => typeof s === 'string' && s.trim()))].sort()
      : [],
    lookSlug: typeof q.lookSlug === 'string' && q.lookSlug.trim() ? q.lookSlug.trim() : null,
  }
}

export function serializeCatalogBrowseQuery(q: CatalogBrowseQuery): URLSearchParams {
  const n = normalizeCatalogBrowseQuery(q)
  const out = new URLSearchParams()
  if (n.page > 1) out.set('page', String(n.page))
  const sortQ = SORT_TO_QUERY[n.sort]
  if (sortQ !== 'nouveautes') out.set('sort', sortQ)
  if (n.colorSlugs.length > 0) out.set('colors', n.colorSlugs.join(','))
  if (n.sizeSlugs.length > 0) out.set('sizes', n.sizeSlugs.join(','))
  if (n.availabilitySlugs.length > 0) out.set('disponibilite', n.availabilitySlugs.join(','))
  if (n.categorySlugs.length > 0) out.set('categories', n.categorySlugs.join(','))
  if (n.brandSlugs.length > 0) out.set('brands', n.brandSlugs.join(','))
  if (n.segmentSlug && n.brandSlugs.length === 0) out.set('segment', n.segmentSlug)
  if (n.subSlug && n.categorySlugs.length === 0) out.set('categorie', n.subSlug)
  if (n.newOnly) out.set('new', '1')
  const tags = n.tagSlugs.length > 0 ? n.tagSlugs : n.tagSlug ? [n.tagSlug] : []
  if (tags.length === 1) out.set('tag', tags[0]!)
  else if (tags.length > 1) out.set('tags', tags.join(','))
  if (n.materialSlugs.length > 0) out.set('materiaux', n.materialSlugs.join(','))
  if (n.lookSlug) out.set('look', n.lookSlug)
  return out
}

export function mergePathAndQuery(pathname: string, q: CatalogBrowseQuery): string {
  const sp = serializeCatalogBrowseQuery(q)
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

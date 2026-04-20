import {NextResponse} from 'next/server'
import {parseSortParam} from '@/lib/catalog/catalog-search-params'
import {
  fetchMarketingCatalogFacets,
  fetchMarketingCatalogItemsPage,
  gridItemsFromRows,
} from '@/lib/catalog/marketing-catalog-items'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function splitIds(raw: string | null): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((id) => UUID_RE.test(id))
}

function parseSort(raw: string | null) {
  return parseSortParam(raw)
}

/** Catalogue marketing paginé (service_role côté serveur uniquement). */
export async function GET(req: Request) {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    return NextResponse.json({error: 'Supabase non configuré'}, {status: 503})
  }

  const url = new URL(req.url)

  if (url.searchParams.get('facets') === '1') {
    const facets = await fetchMarketingCatalogFacets()
    if (!facets) return NextResponse.json({error: 'Facettes indisponibles'}, {status: 503})
    return NextResponse.json({facets})
  }

  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '50', 10) || 50))
  const offset = (page - 1) * limit
  const sort = parseSort(url.searchParams.get('sort'))
  const cat = url.searchParams.get('categoryId')
  const categoryId = cat && UUID_RE.test(cat) ? cat : null

  const {items: rows, total} = await fetchMarketingCatalogItemsPage({
    limit,
    offset,
    sort,
    categoryId,
    brandIds: splitIds(url.searchParams.get('brands')),
    colorIds: splitIds(url.searchParams.get('colors')),
    sizeIds: splitIds(url.searchParams.get('sizes')),
  })

  const items = await gridItemsFromRows(supabase, rows)
  return NextResponse.json({items, total, page, limit})
}

import {NextResponse} from 'next/server'
import {catalogApiCacheHeaders} from '@/lib/catalog/catalog-cache'
import {loadCatalogBrowse} from '@/lib/catalog/catalog-page-loader'
import {parseCatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {studioPickerCorsHeaders} from '@/lib/catalog/studio-picker-cors'

function corsHeaders(req: Request): HeadersInit {
  return {...catalogApiCacheHeaders, ...studioPickerCorsHeaders(req)}
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {status: 204, headers: studioPickerCorsHeaders(req)})
}

/** Grille + facettes scopées pour filtres client (cache CDN court — signed URLs). */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const query = parseCatalogBrowseQuery(url.searchParams)

  const payload = await loadCatalogBrowse(query)
  if (!payload) {
    return NextResponse.json({error: 'Catalogue indisponible'}, {status: 503, headers: corsHeaders(req)})
  }

  return NextResponse.json(
    {
      items: payload.items,
      total: payload.total,
      query: payload.query,
      facets: payload.facets,
      resolved: payload.resolved,
    },
    {headers: corsHeaders(req)},
  )
}

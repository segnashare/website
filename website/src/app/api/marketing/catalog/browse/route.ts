import {NextResponse} from 'next/server'
import {catalogApiCacheHeaders} from '@/lib/catalog/catalog-cache'
import {loadCatalogBrowse} from '@/lib/catalog/catalog-page-loader'
import {parseCatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'

/** Grille + facettes scopées pour filtres client (cache CDN 24 h par combinaison query). */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const query = parseCatalogBrowseQuery(url.searchParams)

  const payload = await loadCatalogBrowse(query)
  if (!payload) {
    return NextResponse.json({error: 'Catalogue indisponible'}, {status: 503})
  }

  return NextResponse.json(
    {
      items: payload.items,
      total: payload.total,
      query: payload.query,
      facets: payload.facets,
      resolved: payload.resolved,
    },
    {headers: catalogApiCacheHeaders},
  )
}

import {NextResponse} from 'next/server'
import {catalogApiCacheHeaders} from '@/lib/catalog/catalog-cache'
import {loadCatalogBrowseFromPath} from '@/lib/catalog/catalog-page-loader'
import {catalogPathInputFromPathname} from '@/lib/catalog/catalog-path-input'
import {parseCatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'

/** Grille + facettes scopées pour filtres client (cache CDN 24 h par combinaison chemin + query). */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const pathname = url.searchParams.get('pathname')?.trim() || '/catalogue'
  const query = parseCatalogBrowseQuery(url.searchParams)
  const pathInput = catalogPathInputFromPathname(pathname)

  const payload = await loadCatalogBrowseFromPath(pathInput, query)
  if (!payload) {
    return NextResponse.json({error: 'Catalogue indisponible'}, {status: 503})
  }

  return NextResponse.json(
    {
      items: payload.items,
      total: payload.total,
      query: payload.query,
      facets: payload.facets,
    },
    {headers: catalogApiCacheHeaders},
  )
}

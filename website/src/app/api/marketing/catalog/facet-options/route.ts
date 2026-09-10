import {NextResponse} from 'next/server'
import {fetchCatalogCmsFacetOptions} from '@/lib/catalog/catalog-cms-facet-options'
import {studioPickerCorsHeaders} from '@/lib/catalog/studio-picker-cors'

function corsHeaders(req: Request): HeadersInit {
  return studioPickerCorsHeaders(req)
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {status: 204, headers: corsHeaders(req)})
}

/** Options de facettes catalogue pour le CMS (ciblage collection). */
export async function GET(req: Request) {
  const data = await fetchCatalogCmsFacetOptions()
  if (!data) {
    return NextResponse.json({error: 'Catalogue indisponible'}, {status: 503, headers: corsHeaders(req)})
  }
  return NextResponse.json(data, {
    headers: {...corsHeaders(req), 'Cache-Control': 'private, max-age=60'},
  })
}

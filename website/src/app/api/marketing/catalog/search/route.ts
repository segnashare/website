import {NextResponse} from 'next/server'
import {searchMarketingCatalogItems} from '@/lib/catalog/marketing-catalog-items'
import {studioPickerCorsHeaders} from '@/lib/catalog/studio-picker-cors'

function corsHeaders(req: Request): HeadersInit {
  return studioPickerCorsHeaders(req)
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {status: 204, headers: corsHeaders(req)})
}

/** Recherche pièces catalogue — utilisée par le picker Sanity Studio. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const limitRaw = Number(url.searchParams.get('limit') ?? '12')
  const limit = Number.isFinite(limitRaw) ? limitRaw : 12

  if (q.length < 2) {
    return NextResponse.json({items: [], uuidDiagnostic: null}, {headers: corsHeaders(req)})
  }

  const result = await searchMarketingCatalogItems(q, {limit})
  return NextResponse.json(
    {
      items: result.items,
      uuidDiagnostic: result.uuidDiagnostic ?? null,
    },
    {headers: {...corsHeaders(req), 'Cache-Control': 'private, max-age=30'}},
  )
}

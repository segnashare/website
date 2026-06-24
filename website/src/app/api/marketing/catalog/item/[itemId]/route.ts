import {NextResponse} from 'next/server'
import {catalogApiCacheHeaders} from '@/lib/catalog/catalog-cache'
import {loadCatalogItemDetail} from '@/lib/catalog/catalog-item-detail'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteContext = {params: Promise<{itemId: string}>}

/** Détail pièce + galerie signée (cache CDN 24 h par item). */
export async function GET(_req: Request, ctx: RouteContext) {
  const {itemId} = await ctx.params
  if (!UUID_RE.test(itemId)) {
    return NextResponse.json({error: 'Identifiant invalide'}, {status: 400})
  }

  const detail = await loadCatalogItemDetail(itemId)
  if (!detail) {
    return NextResponse.json({error: 'Pièce introuvable'}, {status: 404})
  }

  return NextResponse.json(detail, {headers: catalogApiCacheHeaders})
}

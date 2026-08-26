import {revalidatePath, revalidateTag} from 'next/cache'
import {NextRequest, NextResponse} from 'next/server'

import {CATALOG_CACHE_TAG} from '@/lib/catalog/catalog-cache'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const CATALOG_PATHS = ['/', '/catalogue'] as const

function resolveSecret(): string | undefined {
  return (
    process.env.CATALOG_REVALIDATE_SECRET?.trim() ||
    process.env.SANITY_REVALIDATE_SECRET?.trim() ||
    undefined
  )
}

/**
 * Purge cache covers / rows catalogue + ISR home & listing.
 * Appelé par le BO après update photo pièce.
 *
 * POST /api/revalidate/catalog?secret=…
 * body optionnel: { "itemId": "<uuid>" }
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const expected = resolveSecret()

  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Missing CATALOG_REVALIDATE_SECRET (or SANITY_REVALIDATE_SECRET) on website. Add it on Vercel, then redeploy.',
      },
      {status: 500},
    )
  }

  if (secret !== expected) {
    return NextResponse.json({ok: false, message: 'Invalid secret.'}, {status: 401})
  }

  let itemId: string | null = null
  try {
    const body = (await request.json()) as {itemId?: unknown}
    if (typeof body.itemId === 'string' && UUID_RE.test(body.itemId.trim())) {
      itemId = body.itemId.trim()
    }
  } catch {
    // body vide OK
  }

  revalidateTag(CATALOG_CACHE_TAG, 'max')

  const revalidated: string[] = [...CATALOG_PATHS]
  for (const path of CATALOG_PATHS) {
    revalidatePath(path, 'layout')
  }

  if (itemId) {
    const piecePath = `/catalogue/piece/${itemId}`
    revalidatePath(piecePath)
    revalidated.push(piecePath)
  }

  return NextResponse.json({
    ok: true,
    tag: CATALOG_CACHE_TAG,
    revalidated,
    itemId,
    timestamp: new Date().toISOString(),
  })
}

export async function GET() {
  return NextResponse.json({
    ok: Boolean(resolveSecret()),
    tag: CATALOG_CACHE_TAG,
  })
}

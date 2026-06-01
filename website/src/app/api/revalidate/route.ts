import {revalidatePath, revalidateTag} from 'next/cache'
import {NextRequest, NextResponse} from 'next/server'
import {SANITY_CACHE_TAG} from '@/lib/sanity'

type WebhookPayload = {
  _type?: string
  type?: string
}

const REVALIDATED_PATHS = ['/', '/newsroom', '/catalogue', '/aide'] as const

function revalidateConfigured(): boolean {
  return Boolean(process.env.SANITY_REVALIDATE_SECRET?.trim())
}

/** Diagnostic : vérifie que le secret webhook est bien configuré sur Vercel. */
export async function GET() {
  return NextResponse.json({
    ok: revalidateConfigured(),
    webhookReady: revalidateConfigured(),
    cacheTag: SANITY_CACHE_TAG,
  })
}

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const expectedSecret = process.env.SANITY_REVALIDATE_SECRET

  if (!expectedSecret) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Missing SANITY_REVALIDATE_SECRET on server. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.',
      },
      {status: 500},
    )
  }

  if (secret !== expectedSecret) {
    return NextResponse.json({ok: false, message: 'Invalid secret.'}, {status: 401})
  }

  let payload: WebhookPayload | null = null
  try {
    payload = (await request.json()) as WebhookPayload
  } catch {
    payload = null
  }

  revalidateTag(SANITY_CACHE_TAG, 'max')

  for (const path of REVALIDATED_PATHS) {
    revalidatePath(path, 'layout')
  }

  return NextResponse.json({
    ok: true,
    revalidated: REVALIDATED_PATHS,
    tag: SANITY_CACHE_TAG,
    type: payload?._type ?? payload?.type ?? null,
    timestamp: new Date().toISOString(),
  })
}

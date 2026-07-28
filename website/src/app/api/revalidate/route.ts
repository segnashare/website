import {revalidatePath, revalidateTag} from 'next/cache'
import {NextRequest, NextResponse} from 'next/server'
import {SANITY_CACHE_TAG} from '@/lib/sanity'

type WebhookPayload = {
  _type?: string
  type?: string
  _id?: string
  documentId?: string
  /** Sanity transaction webhook: create | update | delete | publish | unpublish */
  transition?: string
  slug?: {current?: string | null} | string | null
}

/** Ignore draft autosaves and non-publish edits — they were busting cache every keystroke. */
function shouldRevalidateFromWebhook(payload: WebhookPayload | null): boolean {
  if (!payload) return true

  const docId = payload._id ?? payload.documentId ?? ''
  if (typeof docId === 'string' && docId.startsWith('drafts.')) {
    return false
  }

  const transition = payload.transition?.toLowerCase()
  if (transition && transition !== 'publish' && transition !== 'unpublish' && transition !== 'delete') {
    return false
  }

  return true
}

const REVALIDATED_PATHS = ['/', '/newsroom', '/catalogue', '/sitemap.xml'] as const

function postSlugFromPayload(payload: WebhookPayload | null): string | null {
  if (!payload?.slug) return null
  if (typeof payload.slug === 'string') {
    const trimmed = payload.slug.trim()
    return trimmed || null
  }
  const current = payload.slug.current?.trim()
  return current || null
}

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

  if (!shouldRevalidateFromWebhook(payload)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'draft-or-non-publish',
      type: payload?._type ?? payload?.type ?? null,
      transition: payload?.transition ?? null,
      timestamp: new Date().toISOString(),
    })
  }

  revalidateTag(SANITY_CACHE_TAG, 'max')

  const revalidated: string[] = [...REVALIDATED_PATHS]
  for (const path of REVALIDATED_PATHS) {
    revalidatePath(path, 'layout')
  }

  const docType = payload?._type ?? payload?.type ?? null
  const postSlug = docType === 'post' ? postSlugFromPayload(payload) : null
  if (postSlug) {
    const articlePath = `/newsroom/${postSlug}`
    revalidatePath(articlePath)
    revalidated.push(articlePath)
  }

  return NextResponse.json({
    ok: true,
    revalidated,
    tag: SANITY_CACHE_TAG,
    type: docType,
    transition: payload?.transition ?? null,
    timestamp: new Date().toISOString(),
  })
}

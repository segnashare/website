import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {NextResponse} from 'next/server'

/**
 * Proxy website → app : déclare une inscription vers Discord / n8n.
 * Auth : `Authorization: Bearer <access_token>`.
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')?.trim() ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ok: false as const, error: 'unauthorized'}, {status: 401})
  }

  const body = await request.json().catch(() => ({}))

  try {
    const response = await fetch(`${SEGNA_APP_BASE_URL}/api/ops/user-registered`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body && typeof body === 'object' ? body : {source: 'website'}),
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => null)
    return NextResponse.json(payload ?? {ok: response.ok}, {status: response.status})
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown'
    console.error('[api/ops/user-registered] proxy failed', detail)
    return NextResponse.json({ok: false as const, error: 'proxy_failed'}, {status: 502})
  }
}

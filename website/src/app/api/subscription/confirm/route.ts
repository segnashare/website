import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {NextResponse} from 'next/server'

/**
 * Proxy website → app : confirme le Checkout Session Stripe (entitlements + empreinte).
 * Auth : `Authorization: Bearer <access_token>`.
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')?.trim() ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({message: 'Session invalide.'}, {status: 401})
  }

  const body = (await request.json().catch(() => null)) as {
    sessionId?: unknown
    planCode?: unknown
  } | null

  try {
    const response = await fetch(`${SEGNA_APP_BASE_URL}/api/stripe/subscription/confirm`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: body?.sessionId,
        planCode: body?.planCode,
      }),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean
      planCode?: string
      message?: string
    } | null

    if (!response.ok) {
      return NextResponse.json(
        {message: payload?.message ?? 'Impossible de confirmer l’abonnement.'},
        {status: response.status},
      )
    }

    return NextResponse.json({ok: true, planCode: payload?.planCode ?? 'segna_x'})
  } catch {
    return NextResponse.json({message: 'Impossible de confirmer l’abonnement.'}, {status: 502})
  }
}

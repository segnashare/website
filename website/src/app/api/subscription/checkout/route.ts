import {WEBSITE_SUBSCRIPTION_RECAP_PATH} from '@/lib/cart/paths'
import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {NextResponse} from 'next/server'

/**
 * Proxy website → app Stripe Checkout SegnaX (trial + empreinte).
 * Auth : `Authorization: Bearer <access_token>` (session Supabase website).
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')?.trim() ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({message: 'Session invalide.'}, {status: 401})
  }

  const origin = new URL(request.url).origin
  const cancelReturnPath = `${origin}${WEBSITE_SUBSCRIPTION_RECAP_PATH}?checkout=cancelled`

  try {
    const response = await fetch(`${SEGNA_APP_BASE_URL}/api/stripe/subscription/checkout`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planCode: 'segna_x',
        trialPeriodDays: 30,
        bankHold: true,
        cancelReturnPath,
      }),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as {
      url?: string
      message?: string
      code?: string
    } | null

    if (!response.ok) {
      return NextResponse.json(
        {
          message: payload?.message ?? 'Impossible de lancer le checkout SegnaX.',
          ...(payload?.code ? {code: payload.code} : {}),
        },
        {status: response.status},
      )
    }

    if (!payload?.url) {
      return NextResponse.json({message: 'Stripe n’a pas renvoyé d’URL de paiement.'}, {status: 502})
    }

    return NextResponse.json({url: payload.url})
  } catch {
    return NextResponse.json({message: 'Impossible de contacter le checkout SegnaX.'}, {status: 502})
  }
}

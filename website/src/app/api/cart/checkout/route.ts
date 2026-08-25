import {WEBSITE_CHECKOUT_PATH} from '@/lib/cart/paths'
import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {NextResponse} from 'next/server'

/**
 * Proxy website → app Stripe Checkout achat panier (`purchaseMode`).
 * Auth : `Authorization: Bearer <access_token>`.
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')?.trim() ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({message: 'Session invalide.'}, {status: 401})
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) {
    return NextResponse.json({message: 'Corps de requête invalide.'}, {status: 400})
  }

  const origin = new URL(request.url).origin
  const cancelReturnPath = `${origin}${WEBSITE_CHECKOUT_PATH}?mode=purchase&checkout=cancelled`

  try {
    const response = await fetch(`${SEGNA_APP_BASE_URL}/api/stripe/cart/checkout`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        purchaseMode: true,
        /** Réduction Segna X réservée à l’app — prix catalogue plein sur le site. */
        applyMemberPurchaseDiscount: false,
        /** Chronopost domicile offert dès 200 € (aligné UI website). */
        websitePurchaseCheckout: true,
        acceptRentalTerms: true,
        deliveryChannel: body.deliveryChannel ?? 'home',
        homeSpeed: body.homeSpeed ?? 'standard',
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
          message: payload?.message ?? 'Impossible de lancer le paiement.',
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
    return NextResponse.json({message: 'Impossible de contacter le checkout Stripe.'}, {status: 502})
  }
}

'use client'

import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {clearWebsiteCart} from '@/lib/cart/website-cart'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {useSearchParams} from 'next/navigation'
import {useEffect, useRef, useState} from 'react'
import styles from './purchaseCheckout.module.css'

type ConfirmState = 'loading' | 'ready' | 'error'

/** Webhook a souvent déjà confirmé avant la page succès — pas une vraie erreur. */
function isAlreadyConfirmedRace(message: string): boolean {
  return /requires checkout_pending \(got confirmed\)|already_confirmed|wallet debit/i.test(message)
}

function clearLocalCartSafely(): void {
  try {
    clearWebsiteCart()
  } catch {
    // ignore (private mode / quota)
  }
}

export function PurchaseSuccessClient() {
  const searchParams = useSearchParams()
  const startedRef = useRef(false)
  const [state, setState] = useState<ConfirmState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [cartId, setCartId] = useState<string | null>(null)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const sessionId = searchParams.get('session_id')?.trim() ?? ''

    // Stripe ne redirige vers /panier/succes qu’après paiement.
    // Vider le panier local tout de suite (badge + /panier), même si confirm
    // échoue (race webhook, session expirée, réseau).
    clearLocalCartSafely()

    void (async () => {
      if (!sessionId) {
        setState('ready')
        return
      }

      try {
        const supabase = createSupabaseBrowserClient()
        const {data} = await supabase.auth.getSession()
        const accessToken = data.session?.access_token
        if (!accessToken) {
          setError('Session expirée. Reconnecte-toi, puis rouvre le lien de confirmation.')
          setState('error')
          return
        }

        const response = await fetch('/api/cart/confirm', {
          method: 'POST',
          credentials: 'omit',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({sessionId}),
        })
        const payload = (await response.json().catch(() => null)) as {
          message?: string
          cartId?: string
        } | null
        if (!response.ok) {
          const msg = payload?.message ?? 'Impossible de confirmer la commande.'
          if (isAlreadyConfirmedRace(msg)) {
            if (payload?.cartId?.trim()) setCartId(payload.cartId.trim())
            setState('ready')
            return
          }
          throw new Error(msg)
        }
        if (payload?.cartId?.trim()) {
          const id = payload.cartId.trim()
          setCartId(id)
          trackWebsiteEvent(
            'order_confirmed',
            {
              cart_id: id,
              checkout_mode: 'stripe',
            },
            {insertId: `order_confirmed:${id}`},
          )
        }
        setState('ready')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Impossible de confirmer la commande.')
        setState('error')
      }
    })()
  }, [searchParams])

  if (state === 'loading') {
    return <WebsitePageLoading label="Confirmation du paiement" />
  }

  const orderHref = cartId ? `/profil/commandes/${cartId}` : '/profil/commandes'

  return (
    <main className={styles.page}>
      <div className={styles.empty}>
        {state === 'ready' ? (
          <>
            <h1 className={styles.title}>Commande confirmée</h1>
            <p className={styles.subtitle}>Merci ! Ton paiement a bien été enregistré.</p>
            <Link href={orderHref} className={styles.payBtn} style={{maxWidth: '16rem', textDecoration: 'none'}}>
              Suivre ma commande
            </Link>
            <Link href="/catalogue" className={styles.backLink} style={{marginTop: '0.85rem'}}>
              Continuer vos achats
            </Link>
          </>
        ) : null}
        {state === 'error' ? (
          <>
            <h1 className={styles.title}>Confirmation en cours</h1>
            <p className={styles.subtitle}>
              {error && !/checkout_pending|wallet debit|Cart cannot|Forbidden:/i.test(error)
                ? error
                : 'Si tu as été débité, ta commande sera finalisée automatiquement sous peu.'}
            </p>
            <Link href="/profil/commandes" className={styles.payBtn} style={{maxWidth: '16rem', textDecoration: 'none'}}>
              Voir mes commandes
            </Link>
            <Link href="/catalogue" className={styles.backLink} style={{marginTop: '0.85rem'}}>
              Retour au catalogue
            </Link>
          </>
        ) : null}
      </div>
    </main>
  )
}

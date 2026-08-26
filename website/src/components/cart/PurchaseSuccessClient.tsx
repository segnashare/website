'use client'

import {OrderSuccessDownloadAppModal} from '@/components/cart/OrderSuccessDownloadAppModal'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {clearWebsiteCart} from '@/lib/cart/website-cart'
import {bumpWebsiteOrderBadge} from '@/lib/orders/website-order-badge'
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
  const [appModalOpen, setAppModalOpen] = useState(false)

  useEffect(() => {
    if (state === 'ready') setAppModalOpen(true)
  }, [state])

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
            if (payload?.cartId?.trim()) {
              const id = payload.cartId.trim()
              setCartId(id)
              bumpWebsiteOrderBadge(id)
            }
            setState('ready')
            return
          }
          throw new Error(msg)
        }
        if (payload?.cartId?.trim()) {
          const id = payload.cartId.trim()
          setCartId(id)
          bumpWebsiteOrderBadge(id)
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
  const appNextPath = cartId ? `/commande/${cartId}` : '/profile'

  return (
    <main className={styles.page}>
      <div className={styles.successPanel}>
        {state === 'ready' ? (
          <>
            <h1 className={styles.successTitle}>Commande confirmée</h1>
            <p className={styles.successSubtitle}>Merci ! Ton paiement a bien été enregistré.</p>
            <div className={styles.successActions}>
              <Link href={orderHref} className={styles.successPrimary}>
                Suivre ma commande
              </Link>
              <Link href="/catalogue" className={styles.successSecondary}>
                Continuer vos achats
              </Link>
            </div>
          </>
        ) : null}
        {state === 'error' ? (
          <>
            <h1 className={styles.successTitle}>Confirmation en cours</h1>
            <p className={styles.successSubtitle}>
              {error && !/checkout_pending|wallet debit|Cart cannot|Forbidden:/i.test(error)
                ? error
                : 'Si tu as été débité, ta commande sera finalisée automatiquement sous peu.'}
            </p>
            <div className={styles.successActions}>
              <Link href="/profil/commandes" className={styles.successPrimary}>
                Voir mes commandes
              </Link>
              <Link href="/catalogue" className={styles.successSecondary}>
                Retour au catalogue
              </Link>
            </div>
          </>
        ) : null}
      </div>

      <OrderSuccessDownloadAppModal
        open={appModalOpen && state === 'ready'}
        onClose={() => setAppModalOpen(false)}
        appNextPath={appNextPath}
      />
    </main>
  )
}

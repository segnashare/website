'use client'

import {
  openIosAppOrAppStore,
  SEGNA_APP_BASE_URL,
  SEGNA_APP_STORE_URL,
} from '@/lib/catalog/catalog-app-links'
import {detectClientPlatform, type ClientPlatform} from '@/lib/platform/client-platform'
import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useSearchParams} from 'next/navigation'
import {useCallback, useEffect, useRef, useState} from 'react'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {WaveDotsLoader} from '@/components/ui/WaveDotsLoader'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {RecapPiecesWall} from './RecapPiecesWall'
import styles from './subscriptionRecap.module.css'

type Props = {
  wallItems: RecapWallItem[]
}

type ConfirmState = 'loading' | 'ready' | 'error'

export function SubscriptionSuccessClient({wallItems}: Props) {
  const searchParams = useSearchParams()
  const confirmStartedRef = useRef(false)
  const [platform, setPlatform] = useState<ClientPlatform>('desktop')
  const [confirmState, setConfirmState] = useState<ConfirmState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setPlatform(detectClientPlatform())
  }, [])

  useEffect(() => {
    if (confirmStartedRef.current) return
    confirmStartedRef.current = true

    const sessionId = searchParams.get('session_id')?.trim() ?? ''
    const planCode = searchParams.get('plan')?.trim() || 'segna_x'

    void (async () => {
      if (!sessionId) {
        // Accès direct / refresh sans session Stripe : on affiche quand même la page succès.
        setConfirmState('ready')
        return
      }

      try {
        const supabase = createSupabaseBrowserClient()
        const {data} = await supabase.auth.getSession()
        const accessToken = data.session?.access_token
        const signedInEmail = data.session?.user?.email?.trim() || null
        if (!accessToken) {
          setErrorMessage('Session expirée. Reconnecte-toi avec le même email que le checkout Stripe, puis réessaie.')
          setConfirmState('error')
          return
        }

        // credentials: 'omit' — évite HTTP 431 (cookies localhost trop gros) ; auth = Bearer.
        const response = await fetch('/api/subscription/confirm', {
          method: 'POST',
          credentials: 'omit',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({sessionId, planCode}),
        })
        const payload = (await response.json().catch(() => null)) as {
          message?: string
          code?: string
        } | null
        if (!response.ok) {
          if (payload?.code === 'user_mismatch' || payload?.message === 'user_mismatch') {
            throw new Error(
              signedInEmail
                ? `Ce paiement est lié à un autre compte. Tu es connecté en tant que ${signedInEmail}. Reconnecte-toi avec l’email du checkout, puis réessaie.`
                : 'Ce paiement est lié à un autre compte Segna. Reconnecte-toi avec l’email utilisé lors du checkout, puis réessaie.',
            )
          }
          throw new Error(payload?.message ?? `Impossible de confirmer l’abonnement (HTTP ${response.status}).`)
        }
        trackWebsiteEvent('subscription_confirmed', {
          plan_code: planCode,
          checkout_mode: 'stripe',
          stripe_session_id: sessionId,
        })
        setConfirmState('ready')
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Impossible de confirmer l’abonnement.')
        setConfirmState('error')
      }
    })()
  }, [searchParams])

  const buildAppHandoffUrl = useCallback(async (): Promise<string> => {
    const supabase = createSupabaseBrowserClient()
    const {data} = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    const refreshToken = data.session?.refresh_token
    if (accessToken && refreshToken) {
      const target = new URL('/auth/handoff', SEGNA_APP_BASE_URL)
      target.hash = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        // Arrive sur Exchange avec la modale « Bienvenue Segna X ».
        type: 'website_subscription_success',
      }).toString()
      return target.toString()
    }
    return `${SEGNA_APP_BASE_URL}/exchange?subscription=success&plan=segna_x`
  }, [])

  const handleDownloadApp = useCallback(async () => {
    if (pending) return
    setPending(true)
    try {
      const appUrl = await buildAppHandoffUrl()
      trackWebsiteEvent('app_open_intent', {
        destination: platform === 'ios' ? 'app_store' : 'app_handoff',
        href: appUrl,
        placement: 'abonnement_succes',
      })
      if (platform === 'ios') {
        openIosAppOrAppStore(appUrl, SEGNA_APP_STORE_URL)
        return
      }
      // Android / desktop : pas de store → ouvrir l’app web (même handoff).
      window.location.assign(appUrl)
    } catch {
      window.location.assign(`${SEGNA_APP_BASE_URL}/auth/login?from=member`)
    } finally {
      setPending(false)
    }
  }, [buildAppHandoffUrl, pending, platform])

  const handleContinueWeb = useCallback(async () => {
    if (pending) return
    setPending(true)
    try {
      window.location.assign(await buildAppHandoffUrl())
    } catch {
      window.location.assign(`${SEGNA_APP_BASE_URL}/auth/login?from=member`)
    } finally {
      setPending(false)
    }
  }, [buildAppHandoffUrl, pending])

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <main className={styles.main}>
          <div className={styles.panel}>
            {confirmState === 'loading' ? (
              <WebsitePageLoading as="div" compact label="Activation de l’abonnement" />
            ) : (
              <>
                <h1 className={styles.title}>
                  {confirmState === 'error' ? 'Paiement reçu' : 'Abonnement lancé'}
                </h1>
                <p className={styles.lead}>
                  {confirmState === 'error'
                    ? 'Ton paiement Stripe est passé, mais l’activation Segna n’a pas pu être confirmée automatiquement. Réessaie ou ouvre l’app — ton abonnement peut déjà être actif.'
                    : 'Ton abonnement SegnaX est bien actif. Tu peux commencer à emprunter des pièces et profiter de tous les avantages de l’abonnement depuis l’app.'}
                </p>

                {confirmState === 'error' && errorMessage ? (
                  <p className={styles.status} role="alert">
                    {errorMessage}
                  </p>
                ) : null}

                {confirmState === 'error' ? (
                  <button
                    type="button"
                    className={styles.cta}
                    disabled={pending}
                    onClick={() => window.location.reload()}
                  >
                    Réessayer l’activation
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.cta}
                    disabled={pending}
                    onClick={() => void handleDownloadApp()}
                  >
                    {pending ? <WaveDotsLoader /> : 'Télécharger l’app'}
                  </button>
                )}

                <button
                  type="button"
                  className={styles.secondaryCta}
                  disabled={pending}
                  onClick={() => void handleContinueWeb()}
                >
                  Continuer sur le web
                </button>
              </>
            )}
          </div>
        </main>

        {wallItems.length > 0 ? (
          <aside className={styles.wallSlot}>
            <RecapPiecesWall items={wallItems} fade="none" />
          </aside>
        ) : null}
      </div>
    </div>
  )
}

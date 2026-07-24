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
        if (!accessToken) {
          setErrorMessage('Session expirée. Reconnecte-toi, ton abonnement est peut‑être déjà actif.')
          setConfirmState('error')
          return
        }

        const response = await fetch('/api/subscription/confirm', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({sessionId, planCode}),
        })
        const payload = (await response.json().catch(() => null)) as {message?: string} | null
        if (!response.ok) {
          throw new Error(payload?.message ?? 'Impossible de confirmer l’abonnement.')
        }
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
        type: 'website_signin',
      }).toString()
      return target.toString()
    }
    return `${SEGNA_APP_BASE_URL}/auth/login?from=member`
  }, [])

  const handleDownloadApp = useCallback(async () => {
    if (pending) return
    setPending(true)
    try {
      const appUrl = await buildAppHandoffUrl()
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
            <h1 className={styles.title}>Abonnement lancé</h1>
            <p className={styles.lead}>
              {confirmState === 'loading'
                ? 'Activation de ton abonnement SegnaX en cours…'
                : 'Ton abonnement SegnaX est bien actif. Tu peux commencer à emprunter des pièces et profiter de tous les avantages de l’abonnement depuis l’app.'}
            </p>

            {confirmState === 'error' && errorMessage ? (
              <p className={styles.status} role="alert">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="button"
              className={styles.cta}
              disabled={pending || confirmState === 'loading'}
              onClick={() => void handleDownloadApp()}
            >
              {pending ? 'Redirection…' : 'Télécharger l’app'}
            </button>

            <button
              type="button"
              className={styles.secondaryCta}
              disabled={pending || confirmState === 'loading'}
              onClick={() => void handleContinueWeb()}
            >
              Continuer sur le web
            </button>
          </div>
        </main>

        {wallItems.length > 0 ? (
          <aside className={styles.wallSlot}>
            <RecapPiecesWall items={wallItems} fade="top" />
          </aside>
        ) : null}
      </div>
    </div>
  )
}

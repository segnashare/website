'use client'

import {bootstrapUserAfterSignup} from '@/lib/auth/bootstrap-user'
import {
  clearWebsiteAuthNext,
  readWebsiteAuthNext,
} from '@/lib/auth/website-auth-next'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'

function safeNextPath(raw: string | null): string {
  const fallback = '/'
  if (!raw?.trim()) return fallback
  try {
    const decoded = decodeURIComponent(raw.trim())
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback
    // Ancien tunnel abo : ne pas renvoyer sur /abonnement nu (landing) après OAuth.
    if (decoded === '/abonnement' || decoded.startsWith('/abonnement/') || decoded.startsWith('/abonnement?')) {
      if (decoded === '/abonnement/recap' || decoded.startsWith('/abonnement/recap?')) return decoded
      if (decoded === '/abonnement/succes' || decoded.startsWith('/abonnement/succes?')) return decoded
      return '/abonnement/recap'
    }
    return decoded
  } catch {
    return fallback
  }
}

function isPasswordRecoveryRedirect(): boolean {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hashParams = new URLSearchParams(hash)
  const query = new URLSearchParams(window.location.search)
  if (hashParams.get('type') === 'recovery' || query.get('type') === 'recovery') return true
  try {
    return window.sessionStorage.getItem('segna_password_recovery') === '1'
  } catch {
    return false
  }
}

function markPasswordRecovery(): void {
  try {
    window.sessionStorage.setItem('segna_password_recovery', '1')
  } catch {
    // ignore
  }
}

/**
 * Finalise l’OAuth website (hash tokens, flow implicit) puis renvoie vers `next`.
 * Ne dépend plus du handoff app → website.
 */
export function AuthCallbackClient() {
  const router = useRouter()
  const [message, setMessage] = useState('Connexion en cours…')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const recoveryRedirect = isPasswordRecoveryRedirect()
      if (recoveryRedirect) markPasswordRecovery()
      // Recovery : ignorer un `next` checkout / sessionStorage (sinon « Qui es-tu ? »).
      const nextPath = recoveryRedirect
        ? '/reset-password'
        : safeNextPath(params.get('next') || readWebsiteAuthNext())
      clearWebsiteAuthNext()
      const authError = params.get('auth_error') || params.get('error')

      if (authError) {
        const target = new URL(nextPath, window.location.origin)
        // Renvoie l’erreur sur signup/signin si possible, sinon next.
        const errHost =
          target.pathname === '/signup' || target.pathname === '/signin'
            ? target
            : new URL('/signin', window.location.origin)
        if (target.pathname !== '/signup' && target.pathname !== '/signin') {
          errHost.searchParams.set('next', `${target.pathname}${target.search}`)
        }
        errHost.searchParams.set('auth_error', authError === 'access_denied' ? 'provider_error' : authError)
        router.replace(`${errHost.pathname}${errHost.search}`)
        return
      }

      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      // PKCE / code flow (si un jour activé côté client)
      const code = params.get('code')

      try {
        const supabase = createSupabaseBrowserClient()

        if (accessToken && refreshToken) {
          const {error} = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
        } else if (code) {
          const {error} = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else {
          // Session déjà détectée via detectSessionInUrl
          const {data} = await supabase.auth.getSession()
          if (!data.session) {
            setMessage('Session manquante. Retour…')
            router.replace(nextPath.startsWith('/signin') || nextPath.startsWith('/signup') ? nextPath : '/signin')
            return
          }
        }

        if (recoveryRedirect || hashParams.get('type') === 'recovery') {
          if (cancelled) return
          window.history.replaceState(null, '', '/reset-password')
          router.replace('/reset-password')
          return
        }

        await bootstrapUserAfterSignup(supabase)

        if (cancelled) return
        const target = new URL(nextPath, window.location.origin)
        const skipCheckoutFlag =
          target.pathname.startsWith('/signin') ||
          target.pathname.startsWith('/signup') ||
          target.pathname.startsWith('/reset-password') ||
          target.pathname.startsWith('/forgot-password')
        const isCartOrCheckout =
          target.pathname === '/panier' ||
          target.pathname.startsWith('/panier/') ||
          target.pathname.startsWith('/catalogue')
        if (!target.searchParams.has('checkout') && !skipCheckoutFlag && isCartOrCheckout) {
          target.searchParams.set('checkout', '1')
        }
        window.history.replaceState(null, '', `${target.pathname}${target.search}`)
        router.replace(`${target.pathname}${target.search}`)
      } catch {
        if (!cancelled) {
          setMessage('Impossible de finaliser la connexion.')
          const target = new URL('/signin', window.location.origin)
          target.searchParams.set('next', nextPath)
          target.searchParams.set('auth_error', 'exchange_failed')
          router.replace(`${target.pathname}${target.search}`)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main
      style={{
        minHeight: '40vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        color: '#3f3f46',
      }}
    >
      <p>{message}</p>
    </main>
  )
}

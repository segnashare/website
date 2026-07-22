'use client'

import {bootstrapUserAfterSignup} from '@/lib/auth/bootstrap-user'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'

function safeNextPath(raw: string | null): string {
  const fallback = '/catalogue'
  if (!raw?.trim()) return fallback
  try {
    const decoded = decodeURIComponent(raw.trim())
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback
    return decoded
  } catch {
    return fallback
  }
}

/**
 * Reçoit le handoff OAuth depuis l’app (`#access_token=…`) puis renvoie vers la fiche produit.
 */
export function AuthCallbackClient() {
  const router = useRouter()
  const [message, setMessage] = useState('Connexion en cours…')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const nextPath = safeNextPath(params.get('next'))
      const authError = params.get('auth_error')

      if (authError) {
        const target = new URL(nextPath, window.location.origin)
        target.searchParams.set('checkout', '1')
        target.searchParams.set('auth_error', authError)
        router.replace(`${target.pathname}${target.search}`)
        return
      }

      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setMessage('Session manquante. Retour au catalogue…')
        router.replace(nextPath)
        return
      }

      try {
        const supabase = createSupabaseBrowserClient()
        const {error} = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          setMessage('Impossible de finaliser la connexion.')
          const target = new URL(nextPath, window.location.origin)
          target.searchParams.set('checkout', '1')
          target.searchParams.set('auth_error', 'exchange_failed')
          router.replace(`${target.pathname}${target.search}`)
          return
        }

        await bootstrapUserAfterSignup(supabase)

        if (cancelled) return
        const target = new URL(nextPath, window.location.origin)
        target.searchParams.set('checkout', '1')
        // Nettoie le hash (tokens) de l’historique.
        window.history.replaceState(null, '', `${target.pathname}${target.search}`)
        router.replace(`${target.pathname}${target.search}`)
      } catch {
        if (!cancelled) {
          setMessage('Erreur de connexion.')
          router.replace(nextPath)
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

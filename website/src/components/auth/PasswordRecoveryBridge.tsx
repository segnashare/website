'use client'

import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useEffect} from 'react'

export const SEGNA_PASSWORD_RECOVERY_STORAGE_KEY = 'segna_password_recovery'

function isRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hashType = new URLSearchParams(hash).get('type')
  const queryType = new URLSearchParams(window.location.search).get('type')
  return hashType === 'recovery' || queryType === 'recovery'
}

function markPasswordRecovery(): void {
  try {
    sessionStorage.setItem(SEGNA_PASSWORD_RECOVERY_STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}

function goToResetPassword(accessToken?: string | null, refreshToken?: string | null) {
  markPasswordRecovery()
  if (window.location.pathname.startsWith('/reset-password')) return

  const target = new URL('/reset-password', window.location.origin)
  if (accessToken && refreshToken) {
    // Conserver les tokens : router.replace() perd le hash et casse la session recovery.
    target.hash = new URLSearchParams({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      type: 'recovery',
    }).toString()
  }
  window.location.replace(`${target.pathname}${target.search}${target.hash}`)
}

/**
 * Si le lien « mot de passe oublié » atterrit hors `/reset-password`
 * (Site URL, /auth/callback, page avec `next` checkout…), renvoie vers
 * le formulaire de nouveau mot de passe au lieu de l’onboarding « Qui es-tu ? ».
 */
export function PasswordRecoveryBridge() {
  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/reset-password') || path.startsWith('/forgot-password')) {
      if (isRecoveryUrl()) markPasswordRecovery()
      return
    }

    // Flag ASAP pour bloquer AuthPageClient / récap / panier avant getUser.
    if (isRecoveryUrl()) markPasswordRecovery()

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const hashParams = new URLSearchParams(hash)
    const accessFromHash = hashParams.get('access_token')
    const refreshFromHash = hashParams.get('refresh_token')

    // Tokens présents → redirect immédiat en préservant le hash.
    if (isRecoveryUrl() && accessFromHash && refreshFromHash) {
      goToResetPassword(accessFromHash, refreshFromHash)
      return
    }

    let cancelled = false
    const supabase = createSupabaseBrowserClient()
    const {data: sub} = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event !== 'PASSWORD_RECOVERY') return
      if (window.location.pathname.startsWith('/reset-password')) {
        markPasswordRecovery()
        return
      }
      goToResetPassword(session?.access_token, session?.refresh_token)
    })

    // Recovery sans tokens dans l’URL (hash déjà consommé) : attendre la session.
    if (isRecoveryUrl()) {
      void supabase.auth.getSession().then(({data}) => {
        if (cancelled) return
        if (window.location.pathname.startsWith('/reset-password')) return
        goToResetPassword(data.session?.access_token, data.session?.refresh_token)
      })
    } else {
      try {
        if (sessionStorage.getItem(SEGNA_PASSWORD_RECOVERY_STORAGE_KEY) === '1') {
          goToResetPassword()
        }
      } catch {
        // ignore
      }
    }

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return null
}

'use client'

import {
  clearWebsiteAuthNext,
  isWebsiteOAuthPending,
  readWebsiteAuthNext,
} from '@/lib/auth/website-auth-next'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {usePathname} from 'next/navigation'
import {useEffect} from 'react'

function hasOAuthReturnInUrl(): boolean {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hashParams = new URLSearchParams(hash)
  if (hashParams.get('access_token') && hashParams.get('refresh_token')) return true
  if (hashParams.get('type') === 'recovery') return true
  const query = new URLSearchParams(window.location.search)
  if (query.get('code')) return true
  if (query.get('type') === 'recovery') return true
  return false
}

/**
 * Si Supabase renvoie sur le Site URL (homepage) au lieu de `/auth/callback`,
 * on reprend le `next` mémorisé (cookie) et on finalise / redirige.
 */
export function WebsiteOAuthReturnBridge() {
  const pathname = usePathname()

  useEffect(() => {
    if (!isWebsiteOAuthPending()) return
    const next = readWebsiteAuthNext()
    if (!next || next === '/' || next.startsWith('/?')) return

    const onAuthCallback = pathname?.startsWith('/auth/callback')
    if (onAuthCallback) return

    // Tokens / code encore dans l’URL (Site URL) → basculer vers le callback en les gardant.
    if (hasOAuthReturnInUrl()) {
      const target = `/auth/callback${window.location.search}${window.location.hash}`
      window.location.replace(target)
      return
    }

    // Hash déjà consommé sur la homepage : session présente → aller au next.
    const onHome = !pathname || pathname === '/'
    if (!onHome) return

    let cancelled = false
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const {data} = await supabase.auth.getSession()
        if (cancelled || !data.session) return
        clearWebsiteAuthNext()
        window.location.replace(next)
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pathname])

  return null
}

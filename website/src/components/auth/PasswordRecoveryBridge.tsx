'use client'

import {useEffect} from 'react'
import {usePathname, useRouter} from 'next/navigation'

import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'

/**
 * Catch-all: liens recovery (hash type=recovery / event PASSWORD_RECOVERY)
 * ne doivent pas atterrir sur l’onboarding « Qui es-tu ? ».
 */
export function PasswordRecoveryBridge() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const goReset = () => {
      if (pathname?.startsWith('/reset-password')) return
      try {
        sessionStorage.setItem('segna_password_recovery', '1')
      } catch {
        // ignore
      }
      router.replace('/reset-password')
    }

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const hashType = new URLSearchParams(hash).get('type')
    const queryType = new URLSearchParams(window.location.search).get('type')
    if (hashType === 'recovery' || queryType === 'recovery') {
      goReset()
      return
    }

    try {
      if (sessionStorage.getItem('segna_password_recovery') === '1') {
        if (!pathname?.startsWith('/reset-password')) {
          goReset()
        }
      }
    } catch {
      // ignore
    }

    const supabase = createSupabaseBrowserClient()
    const {data: sub} = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') goReset()
    })
    return () => sub.subscription.unsubscribe()
  }, [pathname, router])

  return null
}

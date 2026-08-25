'use client'

import {useEffect} from 'react'

import {identifyWebsiteUser, resetWebsiteAnalytics} from '@/lib/analytics/track'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'

/** Stitch website anon → member identity (same Supabase user.id as mobile). */
export function PostHogAuthTracker(): null {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) return

    const supabase = createSupabaseBrowserClient()

    const sync = async () => {
      const {
        data: {session},
      } = await supabase.auth.getSession()
      const user = session?.user
      if (user) {
        identifyWebsiteUser(user.id, user.email)
      }
    }

    void sync()

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user
      if (user) {
        identifyWebsiteUser(user.id, user.email)
        return
      }
      if (event === 'SIGNED_OUT') {
        resetWebsiteAnalytics()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}

'use client'

import {createClient, type SupabaseClient} from '@supabase/supabase-js'

import {getSupabaseAuthPublicEnv} from '@/lib/supabase/public-env'

let browserClient: SupabaseClient | undefined

/**
 * Client Supabase navigateur pour l’auth checkout.
 * Utilise le projet auth de l’app (`NEXT_PUBLIC_SEGNA_AUTH_*` si défini).
 *
 * localStorage + flow implicit : plus simple et plus fiable pour le checkout
 * website que `@supabase/ssr` (cookies chunkées / PKCE), qui peut planter au
 * décodage de session (`Cannot read properties of undefined (reading 'test')`).
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  const env = getSupabaseAuthPublicEnv()
  if (!env) {
    throw new Error(
      'Supabase auth env missing (NEXT_PUBLIC_SEGNA_AUTH_SUPABASE_URL / ANON_KEY ou NEXT_PUBLIC_SUPABASE_*)',
    )
  }
  if (typeof window === 'undefined') {
    return createClient(env.url, env.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }
  if (!browserClient) {
    browserClient = createClient(env.url, env.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
        storage: window.localStorage,
      },
    })
  }
  return browserClient
}

import {createClient, type SupabaseClient} from '@supabase/supabase-js'

let cached: SupabaseClient | null | undefined

/** Client Supabase avec la clé service_role — réservé au code serveur (jamais exposée au navigateur). */
export function getSupabaseServiceRoleClient(): SupabaseClient | null {
  if (cached !== undefined) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    cached = null
    return null
  }

  cached = createClient(url, key, {
    auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
  })
  return cached
}

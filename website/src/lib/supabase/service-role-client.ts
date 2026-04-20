import {createClient, type SupabaseClient} from '@supabase/supabase-js'

let cached: SupabaseClient | null | undefined

function resolveServiceRoleKey(): string | undefined {
  const legacy = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (legacy) return legacy
  // Dashboard récent : « Secret API key » (souvent préfixée sb_secret_)
  return process.env.SUPABASE_SECRET_KEY?.trim()
}

/** Client Supabase avec la clé service_role ou secret — réservé au code serveur (jamais exposée au navigateur). */
export function getSupabaseServiceRoleClient(): SupabaseClient | null {
  if (cached !== undefined) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = resolveServiceRoleKey()
  if (!url || !key) {
    cached = null
    return null
  }

  cached = createClient(url, key, {
    auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
  })
  return cached
}

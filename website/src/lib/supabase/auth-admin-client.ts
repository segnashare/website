import {createClient, type SupabaseClient} from '@supabase/supabase-js'

import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'

/** Admin auth (projet app) si `SEGNA_AUTH_SUPABASE_*` est défini, sinon service catalogue. */
export function getSupabaseAuthAdminClient(): SupabaseClient | null {
  const url =
    process.env.NEXT_PUBLIC_SEGNA_AUTH_SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key =
    process.env.SEGNA_AUTH_SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return getSupabaseServiceRoleClient()
  return createClient(url, key, {
    auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
  })
}

/** Env publiques pour l’auth membre (= projet Supabase de l’app). */
export function getSupabaseAuthPublicEnv(): {url: string; anonKey: string} | null {
  const url =
    process.env.NEXT_PUBLIC_SEGNA_AUTH_SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey =
    process.env.NEXT_PUBLIC_SEGNA_AUTH_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !anonKey) return null
  return {url, anonKey}
}

/** Env catalogue / service (peut différer de l’auth en local). */
export function getSupabasePublicEnv(): {url: string; anonKey: string} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !anonKey) return null
  return {url, anonKey}
}

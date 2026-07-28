export type SupabasePublicEnv = {url: string; anonKey: string}

declare global {
  interface Window {
    __SEGNA_PUBLIC_AUTH__?: SupabasePublicEnv | null
  }
}

/**
 * Fallback prod (clé anon = publique par design).
 * Le bundle Vercel n’inline parfois pas `NEXT_PUBLIC_*` → signup casse en prod uniquement.
 */
const PROD_AUTH_FALLBACK: SupabasePublicEnv = {
  url: 'https://lzdtipwxueczbwpmwyye.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZHRpcHd4dWVjemJ3cG13eXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTc2MzYsImV4cCI6MjA5NDQzMzYzNn0.EWoT5zDSl7FlPF3YVgxjDLDys7N78EaD3e0rZ7sSJLQ',
}

function trimEnv(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Lit les env auth (références statiques pour l’inlining Next). */
function readAuthEnvFromProcess(): SupabasePublicEnv | null {
  const url =
    trimEnv(process.env.NEXT_PUBLIC_SEGNA_AUTH_SUPABASE_URL) ||
    trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const anonKey =
    trimEnv(process.env.NEXT_PUBLIC_SEGNA_AUTH_SUPABASE_ANON_KEY) ||
    trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    trimEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  if (!url || !anonKey) return null
  return {url, anonKey}
}

function readAuthEnvFromWindow(): SupabasePublicEnv | null {
  if (typeof window === 'undefined') return null
  const injected = window.__SEGNA_PUBLIC_AUTH__
  if (!injected?.url?.trim() || !injected?.anonKey?.trim()) return null
  return {url: injected.url.trim(), anonKey: injected.anonKey.trim()}
}

/** Env publiques pour l’auth membre (= projet Supabase de l’app). */
export function getSupabaseAuthPublicEnv(): SupabasePublicEnv | null {
  return readAuthEnvFromWindow() ?? readAuthEnvFromProcess() ?? PROD_AUTH_FALLBACK
}

/** Payload à injecter côté serveur (layout) pour le client. */
export function getSupabaseAuthPublicEnvForClientInject(): SupabasePublicEnv {
  return readAuthEnvFromProcess() ?? PROD_AUTH_FALLBACK
}

/** Env catalogue / service (peut différer de l’auth en local). */
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const anonKey =
    trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    trimEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  if (!url || !anonKey) return null
  return {url, anonKey}
}

import {getSupabaseAuthPublicEnvForClientInject} from '@/lib/supabase/public-env'

/** Injecte URL + anon key auth avant les bundles client (évite signup cassé si inlining Next manque). */
export function SupabasePublicAuthEnvScript() {
  const env = getSupabaseAuthPublicEnvForClientInject()
  const json = JSON.stringify(env).replace(/</g, '\\u003c')
  return (
    <script
      data-cookieconsent="ignore"
      dangerouslySetInnerHTML={{
        __html: `window.__SEGNA_PUBLIC_AUTH__=${json};`,
      }}
    />
  )
}

import type {SupabaseClient} from '@supabase/supabase-js'

type RpcUntyped = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{data?: unknown; error?: {message?: string} | null}>

function rpcOf(supabase: SupabaseClient): RpcUntyped {
  // Ne pas détacher `supabase.rpc` : sinon `this.rest` est undefined.
  return supabase.rpc.bind(supabase) as unknown as RpcUntyped
}

/** Initialise le profil membre après inscription (même RPC que l’app). */
export async function bootstrapUserAfterSignup(supabase: SupabaseClient): Promise<{ok: true} | {ok: false; message: string}> {
  const result = await rpcOf(supabase)('bootstrap_user_after_signup', {
    p_first_name: null,
    p_last_name: null,
    p_locale: null,
    p_timezone: null,
    p_request_id: crypto.randomUUID(),
    p_referral_code: null,
  })
  if (result.error) {
    return {ok: false, message: result.error.message ?? "Impossible d'initialiser le compte."}
  }
  return {ok: true}
}

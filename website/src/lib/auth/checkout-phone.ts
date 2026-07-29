import type {SupabaseClient} from '@supabase/supabase-js'

import {normalizeFrenchPhoneToE164} from '@/lib/phone/fr-mobile'
import {verifyPhoneChangeOtp as verifyPhoneChangeOtpAuth} from '@/lib/phone/verify-phone-change-otp'

type RpcUntyped = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{data?: unknown; error?: {message?: string} | null}>

function rpcOf(supabase: SupabaseClient): RpcUntyped {
  return supabase.rpc.bind(supabase) as unknown as RpcUntyped
}

export type CheckoutPhoneState = {
  /** Numéro saisi (profil), pas forcément validé. */
  pendingE164: string | null
  /** Validé via OTP → présent dans `users.phone`. */
  verified: boolean
}

/** État téléphone pour le tunnel website / activation abo. */
export async function getCheckoutPhoneState(
  supabase: SupabaseClient,
  userId: string,
): Promise<CheckoutPhoneState> {
  const [{data: member}, {data: profile}] = await Promise.all([
    supabase.from('users').select('phone').eq('id', userId).maybeSingle(),
    supabase.from('user_profiles').select('profile_data').eq('user_id', userId).maybeSingle(),
  ])

  const verifiedPhone = ((member as {phone?: string | null} | null)?.phone ?? '').trim()
  const profileData = ((profile as {profile_data?: Record<string, unknown> | null} | null)?.profile_data ??
    {}) as Record<string, unknown>
  const pendingRaw =
    typeof profileData.phone_e164 === 'string' ? profileData.phone_e164.trim() : ''
  const codeVerified = profileData.phone_code_verified === true

  const pendingE164 = normalizeFrenchPhoneToE164(pendingRaw || verifiedPhone)
  const verified = Boolean(verifiedPhone) || codeVerified

  return {pendingE164, verified}
}

/**
 * Enregistre un téléphone « en attente » (profil uniquement).
 * Refuse si le numéro est déjà confirmé (`users.phone`) sur un autre compte.
 * Un simple brouillon non validé ailleurs ne bloque pas.
 */
export async function savePendingCheckoutPhone(
  supabase: SupabaseClient,
  phoneRaw: string,
): Promise<{ok: true; e164: string} | {ok: false; message: string}> {
  const e164 = normalizeFrenchPhoneToE164(phoneRaw)
  if (!e164) {
    return {ok: false, message: 'Saisis un numéro de mobile français valide.'}
  }

  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return {ok: false, message: 'Tu dois être connecté pour enregistrer ton téléphone.'}
  }

  const rpc = rpcOf(supabase)
  // Unicité = numéros déjà validés uniquement (`users.phone`).
  const {data: phoneOk, error: phoneAvailErr} = await rpc('phone_available_for_user_change', {
    p_phone: e164,
    p_user_id: user.id,
  })
  if (phoneAvailErr) {
    return {ok: false, message: phoneAvailErr.message ?? 'Impossible de vérifier le numéro.'}
  }
  if (phoneOk !== true) {
    return {ok: false, message: 'Ce numéro de téléphone est déjà utilisé par un autre compte.'}
  }

  const {data: memberRow} = await supabase.from('users').select('phone').eq('id', user.id).maybeSingle()
  const existingVerified = normalizeFrenchPhoneToE164(
    ((memberRow as {phone?: string | null} | null)?.phone ?? '').trim() || null,
  )

  // Même numéro déjà validé : ne pas l’effacer (sinon le gate paiement Stripe bloque).
  if (existingVerified === e164) {
    const profileResult = await rpc('update_user_profile_public', {
      p_profile_json: {
        profile_data: {
          phone_e164: e164,
          phone_code_verified: true,
        },
      },
      p_request_id: crypto.randomUUID(),
    })
    if (profileResult.error) {
      return {ok: false, message: profileResult.error.message ?? "Impossible d'enregistrer ton téléphone."}
    }
    return {ok: true, e164}
  }

  const profileResult = await rpc('update_user_profile_public', {
    p_profile_json: {
      profile_data: {
        phone_e164: e164,
        phone_code_verified: false,
      },
    },
    p_request_id: crypto.randomUUID(),
  })
  if (profileResult.error) {
    return {ok: false, message: profileResult.error.message ?? "Impossible d'enregistrer ton téléphone."}
  }

  // Libère l’unicité `users.phone` tant que le numéro n’est pas validé par OTP.
  const {error: clearErr} = await supabase.from('users').update({phone: null}).eq('id', user.id)
  if (clearErr) {
    // Non bloquant si la colonne est déjà null / droits partiels.
    console.warn('[checkout-phone] clear users.phone', clearErr.message)
  }

  return {ok: true, e164}
}

/** Envoie le SMS OTP (Supabase Auth phone_change). Blocage unicité des numéros déjà validés. */
export async function sendCheckoutPhoneOtp(
  supabase: SupabaseClient,
  phoneRaw: string,
): Promise<{ok: true; e164: string} | {ok: false; message: string}> {
  const e164 = normalizeFrenchPhoneToE164(phoneRaw)
  if (!e164) {
    return {ok: false, message: 'Numéro invalide.'}
  }

  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return {ok: false, message: 'Session expirée. Reconnecte-toi.'}
  }

  const rpc = rpcOf(supabase)
  const {data: phoneOk, error: phoneAvailErr} = await rpc('phone_available_for_user_change', {
    p_phone: e164,
    p_user_id: user.id,
  })
  if (phoneAvailErr) {
    return {ok: false, message: phoneAvailErr.message ?? 'Impossible de vérifier le numéro.'}
  }
  if (phoneOk !== true) {
    return {ok: false, message: 'Ce numéro de téléphone est déjà utilisé par un autre compte.'}
  }

  const {error: otpError} = await supabase.auth.updateUser({phone: e164})
  if (otpError) {
    const msg = (otpError.message ?? '').toLowerCase()
    if (msg.includes('unable to get sms provider')) {
      return {
        ok: false,
        message: "Le fournisseur SMS n'est pas configuré. Active Twilio dans Supabase (Auth > Phone).",
      }
    }
    if (msg.includes('rate limit')) {
      return {ok: false, message: 'Trop de tentatives. Réessaie dans une minute.'}
    }
    if (msg.includes('already') || msg.includes('registered')) {
      return {ok: false, message: 'Ce numéro de téléphone est déjà utilisé par un autre compte.'}
    }
    return {ok: false, message: otpError.message || "Impossible d'envoyer le code SMS."}
  }

  return {ok: true, e164}
}

/** Vérifie le code SMS puis pose le téléphone validé (`users.phone` + profil). */
export async function verifyCheckoutPhoneOtp(
  supabase: SupabaseClient,
  phoneRaw: string,
  token: string,
): Promise<{ok: true} | {ok: false; message: string}> {
  const e164 = normalizeFrenchPhoneToE164(phoneRaw)
  if (!e164) {
    return {ok: false, message: 'Numéro invalide.'}
  }
  const code = token.replace(/\D/g, '').slice(0, 6)
  if (code.length !== 6) {
    return {ok: false, message: 'Saisis le code à 6 chiffres.'}
  }

  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return {ok: false, message: 'Session expirée. Reconnecte-toi.'}
  }

  // Re-check unicité juste avant de verrouiller le numéro.
  const rpc = rpcOf(supabase)
  const {data: phoneOk, error: phoneAvailErr} = await rpc('phone_available_for_user_change', {
    p_phone: e164,
    p_user_id: user.id,
  })
  if (phoneAvailErr) {
    return {ok: false, message: phoneAvailErr.message ?? 'Impossible de vérifier le numéro.'}
  }
  if (phoneOk !== true) {
    return {ok: false, message: 'Ce numéro de téléphone est déjà utilisé par un autre compte.'}
  }

  const verified = await verifyPhoneChangeOtpAuth(supabase, e164, code)
  if (!verified.ok) {
    return verified
  }

  const {error: phoneError} = await rpc('set_user_phone_verified', {
    p_phone_e164: e164,
    p_request_id: crypto.randomUUID(),
  })
  if (phoneError) {
    return {ok: false, message: phoneError.message ?? "Impossible d'enregistrer le téléphone validé."}
  }

  const {error: profileError} = await rpc('update_user_profile_public', {
    p_profile_json: {
      profile_data: {
        phone_e164: e164,
        phone_code_verified: true,
      },
    },
    p_request_id: crypto.randomUUID(),
  })
  if (profileError) {
    return {ok: false, message: profileError.message ?? 'Impossible de mettre à jour le profil.'}
  }

  return {ok: true}
}

import type {SupabaseClient} from '@supabase/supabase-js'

function capitalizeFirstLetter(value: string): string {
  const t = value.trim()
  if (!t) return t
  return t.charAt(0).toLocaleUpperCase('fr-FR') + t.slice(1)
}

type RpcUntyped = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{data?: unknown; error?: {message?: string} | null}>

function rpcOf(supabase: SupabaseClient): RpcUntyped {
  // Ne pas détacher `supabase.rpc` : sinon `this.rest` est undefined.
  return supabase.rpc.bind(supabase) as unknown as RpcUntyped
}

export type OnboardingLocationPayload = {
  label: string
  relativeCity: string | null
  timezone: string
  lat: number | null
  lon: number | null
}

async function persistOnboardingNameFields(
  supabase: SupabaseClient,
  firstName: string,
  lastName: string,
): Promise<{ok: true} | {ok: false; message: string}> {
  const rpc = rpcOf(supabase)
  const settingsResult = await rpc('update_user_account_settings', {
    p_locale: null,
    p_timezone: null,
    p_first_name: capitalizeFirstLetter(firstName),
    p_last_name: capitalizeFirstLetter(lastName) || null,
    p_request_id: crypto.randomUUID(),
  })
  if (settingsResult.error) {
    return {ok: false, message: settingsResult.error.message ?? "Impossible d'enregistrer ton nom."}
  }
  return {ok: true}
}

async function persistOnboardingLocationFields(
  supabase: SupabaseClient,
  location: OnboardingLocationPayload,
): Promise<{ok: true} | {ok: false; message: string}> {
  const rpc = rpcOf(supabase)
  const label = location.label.trim()
  if (!label) return {ok: false, message: 'Sélectionne une adresse dans la liste.'}

  const locationResult = await rpc('set_user_location', {
    p_adress: label,
    p_timezone: location.timezone || 'Europe/Paris',
    p_relative_city: location.relativeCity,
    p_request_id: crypto.randomUUID(),
  })
  if (locationResult.error) {
    return {ok: false, message: locationResult.error.message ?? "Impossible d'enregistrer ton adresse."}
  }

  const profileResult = await rpc('update_user_profile_public', {
    p_profile_json: {
      profile_data: {
        location: {
          label,
          lat: location.lat,
          lon: location.lon,
          timezone: location.timezone || 'Europe/Paris',
        },
      },
    },
    p_request_id: crypto.randomUUID(),
  })
  if (profileResult.error) {
    return {ok: false, message: profileResult.error.message ?? 'Impossible de mettre à jour le profil.'}
  }

  return {ok: true}
}

export async function saveOnboardingName(
  supabase: SupabaseClient,
  firstName: string,
  lastName: string,
): Promise<{ok: true} | {ok: false; message: string}> {
  const nameResult = await persistOnboardingNameFields(supabase, firstName, lastName)
  if (!nameResult.ok) return nameResult

  const rpc = rpcOf(supabase)
  const progress = await rpc('upsert_onboarding_progress', {
    p_current_step: '/onboarding/birth',
    p_progress_json: {checkpoint: '/onboarding/name'},
    p_request_id: crypto.randomUUID(),
  })
  if (progress.error) return {ok: false, message: progress.error.message ?? 'Erreur de progression.'}
  return {ok: true}
}

/** Nom + adresse (étape 2 du tunnel website) — progression seulement si les deux OK. */
export async function saveOnboardingNameAndAddress(
  supabase: SupabaseClient,
  firstName: string,
  lastName: string,
  location: OnboardingLocationPayload,
): Promise<{ok: true} | {ok: false; message: string}> {
  const nameResult = await persistOnboardingNameFields(supabase, firstName, lastName)
  if (!nameResult.ok) return nameResult

  const locationResult = await persistOnboardingLocationFields(supabase, location)
  if (!locationResult.ok) return locationResult

  const rpc = rpcOf(supabase)
  const progress = await rpc('upsert_onboarding_progress', {
    p_current_step: '/onboarding/birth',
    p_progress_json: {checkpoint: '/onboarding/name'},
    p_request_id: crypto.randomUUID(),
  })
  if (progress.error) return {ok: false, message: progress.error.message ?? 'Erreur de progression.'}
  return {ok: true}
}

export async function saveOnboardingBirthDate(
  supabase: SupabaseClient,
  isoDate: string,
): Promise<{ok: true} | {ok: false; message: string}> {
  const rpc = rpcOf(supabase)
  const birthResult = await rpc('set_user_birth_date', {
    p_birth_date: isoDate,
    p_request_id: crypto.randomUUID(),
  })
  if (birthResult.error) {
    return {ok: false, message: birthResult.error.message ?? "Impossible d'enregistrer ta date de naissance."}
  }

  const profileResult = await rpc('update_user_profile_public', {
    p_profile_json: {
      profile_data: {
        birth_date: isoDate,
        age: {visibility: true},
      },
    },
    p_request_id: crypto.randomUUID(),
  })
  if (profileResult.error) {
    return {ok: false, message: profileResult.error.message ?? 'Impossible de mettre à jour le profil.'}
  }

  const progress = await rpc('upsert_onboarding_progress', {
    p_current_step: '/onboarding/size',
    p_progress_json: {checkpoint: '/onboarding/birth'},
    p_request_id: crypto.randomUUID(),
  })
  if (progress.error) return {ok: false, message: progress.error.message ?? 'Erreur de progression.'}
  return {ok: true}
}

export async function saveOnboardingSizes(
  supabase: SupabaseClient,
  topLabels: string[],
  bottomLabels: string[],
  shoesLabels: string[],
): Promise<{ok: true} | {ok: false; message: string}> {
  const rpc = rpcOf(supabase)
  const topCodes = topLabels.map((c) => `top:${c}`)
  const bottomCodes = bottomLabels.map((c) => `bottom:${c}`)
  const shoesCodes = shoesLabels.map((c) => `shoes:${c}`)

  const {error: rpcNewError} = await rpc('set_user_profile_sizes', {
    p_top_size_codes: topCodes,
    p_bottom_size_codes: bottomCodes,
    p_shoes_size_codes: shoesCodes,
    p_request_id: crypto.randomUUID(),
  })

  if (rpcNewError) {
    const rpcMsg = rpcNewError.message ?? ''
    const missing = /could not find the function|schema cache|42883|function public\.set_user_profile_sizes/i.test(
      rpcMsg,
    )
    if (!missing) return {ok: false, message: rpcMsg}

    const {
      data: {user},
    } = await supabase.auth.getUser()
    if (!user?.id) return {ok: false, message: 'Tu dois être connectée pour enregistrer tes tailles.'}

    const {data: profile, error: profileError} = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profileError || !(profile as {id?: string} | null)?.id) {
      return {ok: false, message: profileError?.message ?? 'Profil introuvable.'}
    }
    const profileId = (profile as {id: string}).id

    const allCodes = [...new Set([...topCodes, ...bottomCodes, ...shoesCodes])]
    const {data: sizeRows, error: sizesLookupError} = await supabase.from('sizes').select('id,code').in('code', allCodes)
    if (sizesLookupError) return {ok: false, message: sizesLookupError.message}
    const idByCode = new Map(
      ((sizeRows ?? []) as Array<{id: string; code: string | null}>).map((row) => [row.code ?? '', row.id]),
    )
    for (const code of allCodes) {
      if (!idByCode.get(code)) return {ok: false, message: `Taille inconnue : ${code}`}
    }

    const rows = [
      ...topCodes.map((code) => ({user_profile_id: profileId, category: 'top', size_id: idByCode.get(code)!})),
      ...bottomCodes.map((code) => ({user_profile_id: profileId, category: 'bottom', size_id: idByCode.get(code)!})),
      ...shoesCodes.map((code) => ({user_profile_id: profileId, category: 'shoes', size_id: idByCode.get(code)!})),
    ]

    const {error: deleteError} = await supabase
      .from('user_profile_sizes')
      .delete()
      .eq('user_profile_id', profileId)
      .in('category', ['top', 'bottom', 'shoes'])
    if (deleteError) return {ok: false, message: deleteError.message}

    const {error: insertError} = await supabase.from('user_profile_sizes').insert(rows)
    if (insertError) return {ok: false, message: insertError.message}
  }

  const progress = await rpc('upsert_onboarding_progress', {
    p_current_step: '/onboarding/3',
    p_progress_json: {checkpoint: '/onboarding/size'},
    p_request_id: crypto.randomUUID(),
  })
  if (progress.error) return {ok: false, message: progress.error.message ?? 'Erreur de progression.'}
  return {ok: true}
}

export function isValidBirthDate(day: string, month: string, year: string): boolean {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return false
  const dayNumber = Number(day)
  const monthNumber = Number(month)
  const yearNumber = Number(year)
  const nowYear = new Date().getFullYear()
  if (!Number.isInteger(dayNumber) || !Number.isInteger(monthNumber) || !Number.isInteger(yearNumber)) return false
  if (yearNumber < 1900 || yearNumber > nowYear) return false
  if (monthNumber < 1 || monthNumber > 12) return false
  const candidate = new Date(yearNumber, monthNumber - 1, dayNumber)
  return (
    candidate.getFullYear() === yearNumber &&
    candidate.getMonth() === monthNumber - 1 &&
    candidate.getDate() === dayNumber
  )
}

import type {SupabaseClient} from '@supabase/supabase-js'

export type CheckoutOnboardingStep = 1 | 2 | 3 | 4

export type CheckoutOnboardingResume =
  | {status: 'need_auth'}
  | {status: 'ready'; email: string}
  | {status: 'resume'; email: string; step: CheckoutOnboardingStep}

/** Étapes app au-delà du tunnel website (nom → naissance → tailles). */
function isPastWebsiteCheckoutOnboarding(currentStep: string | null | undefined): boolean {
  if (!currentStep) return false
  const past = [
    '/onboarding/3',
    '/onboarding/work',
    '/onboarding/location',
    '/onboarding/style',
    '/onboarding/brands',
    '/onboarding/budget',
    '/onboarding/share',
    '/onboarding/privacy',
    '/onboarding/end',
    '/onboarding/phone',
  ]
  return past.some((p) => currentStep === p || currentStep.startsWith(`${p}/`))
}

async function hasCheckoutSizes(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const {data: profile} = await supabase.from('user_profiles').select('id').eq('user_id', userId).maybeSingle()
  const profileId = (profile as {id?: string} | null)?.id
  if (!profileId) return false

  const {data: rows} = await supabase
    .from('user_profile_sizes')
    .select('category')
    .eq('user_profile_id', profileId)
    .in('category', ['top', 'bottom', 'shoes'])

  const cats = new Set(((rows ?? []) as Array<{category: string}>).map((r) => r.category))
  return cats.has('top') && cats.has('bottom') && cats.has('shoes')
}

/**
 * Après validation e-mail : reprendre le tunnel checkout (nom / naissance / tailles)
 * ou considérer le membre prêt pour Stripe.
 */
export async function resolveCheckoutOnboardingResume(
  supabase: SupabaseClient,
): Promise<CheckoutOnboardingResume> {
  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user?.email) return {status: 'need_auth'}

  const email = user.email
  if (!user.email_confirmed_at) {
    return {status: 'resume', email, step: 1}
  }

  const [{data: member}, {data: onboarding}] = await Promise.all([
    supabase.from('users').select('first_name, birth_date').eq('id', user.id).maybeSingle(),
    supabase.from('onboarding_sessions').select('current_step, status').eq('user_id', user.id).maybeSingle(),
  ])

  const row = member as {first_name?: string | null; birth_date?: string | null} | null
  const progress = onboarding as {current_step?: string | null; status?: string | null} | null

  if (progress?.status === 'completed' || isPastWebsiteCheckoutOnboarding(progress?.current_step)) {
    return {status: 'ready', email}
  }

  const hasName = (row?.first_name ?? '').trim().length >= 2
  const hasBirth = Boolean(row?.birth_date)
  const sized = hasName && hasBirth ? await hasCheckoutSizes(supabase, user.id) : false

  if (hasName && hasBirth && sized) {
    return {status: 'ready', email}
  }

  const path = progress?.current_step ?? ''
  if (path === '/onboarding/size' || (hasName && hasBirth)) {
    return {status: 'resume', email, step: 4}
  }
  if (path === '/onboarding/birth' || hasName) {
    return {status: 'resume', email, step: 3}
  }

  return {status: 'resume', email, step: 2}
}

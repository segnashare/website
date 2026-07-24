import type {SupabaseClient} from '@supabase/supabase-js'

/**
 * Abonnement Segna actif (Stripe `active` / `trialing`, plan ≠ guest).
 */
export async function hasActivePaidSubscription(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user?.id) return false

  const [{data: subRow}, {data: membershipState}] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('plan_code, status')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .order('updated_at', {ascending: false})
      .limit(1)
      .maybeSingle(),
    supabase.rpc('get_current_membership_state'),
  ])

  const fromTable = isActivePaidPlan(
    (subRow as {plan_code?: string | null; status?: string | null} | null)?.plan_code,
    (subRow as {plan_code?: string | null; status?: string | null} | null)?.status,
  )
  if (fromTable) return true

  const state = membershipState as {plan_code?: string | null; subscription_status?: string | null} | null
  return isActivePaidPlan(state?.plan_code, state?.subscription_status)
}

function isActivePaidPlan(planCode: string | null | undefined, status: string | null | undefined): boolean {
  const st = (status ?? '').toLowerCase()
  const plan = (planCode ?? '').toLowerCase()
  if (!(st === 'active' || st === 'trialing')) return false
  return plan === 'segna_x' || plan === 'segna_plus'
}

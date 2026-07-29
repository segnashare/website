import type {SupabaseClient} from '@supabase/supabase-js'

const OPEN_STATUSES = ['active', 'checkout_pending'] as const

/**
 * Aligne le panier DB sur les pièces du panier website, puis réserve (`checkout_pending`).
 */
export async function syncAndReserveWebsiteCartForCheckout(
  supabase: SupabaseClient,
  userId: string,
  itemIds: string[],
): Promise<{ok: true; cartId: string} | {ok: false; message: string}> {
  const uniqueIds = [...new Set(itemIds.map((id) => id.trim()).filter(Boolean))]
  if (uniqueIds.length === 0) {
    return {ok: false, message: 'Panier vide.'}
  }

  const {data: existingCart, error: cartReadError} = await supabase
    .from('carts')
    .select('id, status')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .in('status', [...OPEN_STATUSES])
    .order('updated_at', {ascending: false})
    .limit(1)
    .maybeSingle()

  if (cartReadError) {
    return {ok: false, message: cartReadError.message || 'Impossible de lire le panier.'}
  }

  let cartId = (existingCart as {id?: string} | null)?.id ?? null
  if (!cartId) {
    const {data: created, error: createError} = await supabase
      .from('carts')
      .insert({user_id: userId, status: 'active'})
      .select('id')
      .single()
    if (createError || !(created as {id?: string} | null)?.id) {
      return {ok: false, message: createError?.message || 'Impossible de créer le panier.'}
    }
    cartId = (created as {id: string}).id
  }

  const {data: currentLines, error: linesError} = await supabase
    .from('cart_items')
    .select('id, item_id, deleted_at')
    .eq('cart_id', cartId)

  if (linesError) {
    return {ok: false, message: linesError.message || 'Impossible de lire les lignes panier.'}
  }

  const lines = (currentLines ?? []) as Array<{
    id: string
    item_id: string
    deleted_at: string | null
  }>
  const wanted = new Set(uniqueIds)

  for (const line of lines) {
    if (line.deleted_at) continue
    if (!wanted.has(line.item_id)) {
      const {error} = await supabase
        .from('cart_items')
        .update({deleted_at: new Date().toISOString()})
        .eq('id', line.id)
      if (error) {
        return {ok: false, message: error.message || 'Impossible de mettre à jour le panier.'}
      }
    }
  }

  for (const itemId of uniqueIds) {
    const active = lines.find((l) => l.item_id === itemId && !l.deleted_at)
    if (active) continue
    const softDeleted = lines
      .filter((l) => l.item_id === itemId && l.deleted_at)
      .sort((a, b) => b.id.localeCompare(a.id))[0]
    if (softDeleted) {
      const {error} = await supabase
        .from('cart_items')
        .update({deleted_at: null, status: 'in_cart'})
        .eq('id', softDeleted.id)
      if (error) {
        return {ok: false, message: error.message || 'Impossible de restaurer une ligne panier.'}
      }
      continue
    }
    const {error} = await supabase.from('cart_items').insert({
      cart_id: cartId,
      item_id: itemId,
      owner_user_id: userId,
      status: 'in_cart',
    })
    if (error) {
      return {ok: false, message: error.message || 'Impossible d’ajouter une pièce au panier.'}
    }
  }

  const {data: reserveData, error: reserveError} = await supabase.rpc('reserve_cart_atomic', {
    p_cart_id: cartId,
    p_hold_ttl_minutes: 10,
    p_lock_ttl_seconds: 600,
  })

  if (reserveError) {
    const raw = (reserveError.message ?? '').toUpperCase()
    if (raw.includes('ITEM_RESERVED_BY_ANOTHER_MEMBER')) {
      return {
        ok: false,
        message: 'Une pièce a été réservée par un autre membre — retire-la du panier ou réessaie.',
      }
    }
    return {ok: false, message: reserveError.message || 'Réservation du panier impossible.'}
  }

  let payload: {ok?: boolean} | null = null
  if (reserveData != null && typeof reserveData === 'object' && !Array.isArray(reserveData)) {
    payload = reserveData as {ok?: boolean}
  } else if (typeof reserveData === 'string') {
    try {
      payload = JSON.parse(reserveData) as {ok?: boolean}
    } catch {
      payload = null
    }
  }

  if (payload && payload.ok === false) {
    return {ok: false, message: 'Réservation du panier refusée.'}
  }

  return {ok: true, cartId}
}

import {
  resolveMemberOrderKindFromCart,
} from '@/lib/orders/member-order-kind'
import type {SupabaseClient} from '@supabase/supabase-js'

/** Aligné liste commandes website : achat + réception pas encore « terminée ». */
const MEMBER_RECEIPT_AUTO_CONFIRM_AFTER_MS = 24 * 60 * 60 * 1000

type CartRow = {
  id: string
  status: string | null
  member_receipt_confirmed_at?: string | null
  checkout_purchase_mode?: boolean | null
  cart_order_stripe_invoices?:
    | {guest_purchase_stripe_invoice_id?: string | null}
    | {guest_purchase_stripe_invoice_id?: string | null}[]
    | null
}

type ShipRow = {
  cart_id: string
  status: string
  updated_at: string
  delivered_at?: string | null
}

function isPurchaseFinished(
  memberReceiptConfirmedAt: string | null | undefined,
  outbound: ShipRow | undefined,
  nowMs: number,
): boolean {
  if (memberReceiptConfirmedAt?.trim()) return true
  if (!outbound || outbound.status.trim().toLowerCase() !== 'delivered') return false
  const anchorIso = (outbound.delivered_at?.trim() || outbound.updated_at || '').trim()
  if (!anchorIso) return false
  const anchor = Date.parse(anchorIso)
  if (Number.isNaN(anchor)) return false
  return nowMs >= anchor + MEMBER_RECEIPT_AUTO_CONFIRM_AFTER_MS
}

/**
 * Nombre d’achats « En cours » (pastille profil / Mes commandes).
 * Léger : pas de thumbs ni d’historique.
 */
export async function fetchOngoingPurchaseOrderCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const nowMs = Date.now()
  const {data} = await supabase
    .from('carts')
    .select(
      'id,status,member_receipt_confirmed_at,checkout_purchase_mode,cart_order_stripe_invoices(guest_purchase_stripe_invoice_id)',
    )
    .eq('user_id', userId)
    .is('deleted_at', null)
    .in('status', ['confirmed', 'archived', 'disputed'])
    .order('updated_at', {ascending: false})
    .limit(50)

  const purchaseRows = ((data ?? []) as CartRow[]).filter(
    (r) => resolveMemberOrderKindFromCart(r) === 'achat',
  )
  if (purchaseRows.length === 0) return 0

  const ids = purchaseRows.map((r) => r.id)
  const {data: shipments} = await supabase
    .from('shipments')
    .select('cart_id,status,updated_at,delivered_at')
    .in('cart_id', ids)
    .eq('context', 'cart_outbound')
    .is('deleted_at', null)
    .order('updated_at', {ascending: false})

  const outboundByCart = new Map<string, ShipRow>()
  for (const row of (shipments ?? []) as ShipRow[]) {
    if (!outboundByCart.has(row.cart_id)) outboundByCart.set(row.cart_id, row)
  }

  return purchaseRows.filter((order) => {
    if (String(order.status ?? '').toLowerCase() === 'canceled') return false
    return !isPurchaseFinished(
      order.member_receipt_confirmed_at,
      outboundByCart.get(order.id),
      nowMs,
    )
  }).length
}

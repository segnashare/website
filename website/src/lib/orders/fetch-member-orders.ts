import {createSignedUrlForStoragePath} from '@/lib/catalog/storage-signed-url'
import {getFirstPhotoStoragePath} from '@/lib/orders/item-photo-path'
import {
  formatOrderNumberCompact,
  memberOrderTypeLabel,
  resolveMemberOrderKindFromCart,
  type MemberOrderKind,
} from '@/lib/orders/member-order-kind'
import {outboundStatusTitle} from '@/lib/orders/shipment-status-copy'
import type {SupabaseClient} from '@supabase/supabase-js'

export type WebsiteOrderCard = {
  id: string
  orderKind: MemberOrderKind
  orderTypeLabel: string
  orderNumberCompact: string
  statusLabel: string
  showPulse?: boolean
  itemThumbUrls: string[]
  /** Chemin app pour handoff session. */
  appDetailPath: string
  updatedAt: string
}

export type MemberOrdersBundle = {
  ongoing: WebsiteOrderCard[]
  history: WebsiteOrderCard[]
}

type CartRow = {
  id: string
  status: string | null
  created_at: string
  updated_at: string
  member_receipt_confirmed_at?: string | null
  checkout_borrow_duration_days?: number | null
  checkout_purchase_mode?: boolean | null
  cart_order_stripe_invoices?:
    | {guest_purchase_stripe_invoice_id?: string | null}
    | {guest_purchase_stripe_invoice_id?: string | null}[]
    | null
}

type ShipmentRow = {
  cart_id: string
  status: string
  updated_at: string
  delivered_at?: string | null
  context: string
}

/** Aligné app `isPurchaseFinishedForMemberList` (réception manuelle ou auto 24 h). */
const MEMBER_RECEIPT_AUTO_CONFIRM_AFTER_MS = 24 * 60 * 60 * 1000

function isPurchaseFinishedForList(
  memberReceiptConfirmedAt: string | null | undefined,
  outbound: ShipmentRow | undefined,
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

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

async function fetchThumbsByCartIds(
  supabase: SupabaseClient,
  cartIds: string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  for (const id of cartIds) out.set(id, [])
  if (cartIds.length === 0) return out

  const {data: cartItems} = await supabase
    .from('cart_items')
    .select('cart_id,item_id,created_at')
    .in('cart_id', cartIds)
    .is('deleted_at', null)
    .order('created_at', {ascending: true})

  const rows = (cartItems ?? []) as {cart_id: string; item_id: string}[]
  const itemIds = [...new Set(rows.map((r) => r.item_id))]
  if (itemIds.length === 0) return out

  const {data: items} = await supabase.from('items').select('id,photos').in('id', itemIds)
  const itemsMap = new Map(
    ((items ?? []) as {id: string; photos?: unknown}[]).map((item) => [item.id, item]),
  )

  const pathsByCart = new Map<string, string[]>()
  for (const id of cartIds) pathsByCart.set(id, [])
  const toSign = new Set<string>()

  for (const row of rows) {
    const path = getFirstPhotoStoragePath(itemsMap.get(row.item_id)?.photos ?? null)
    if (!path) continue
    if (!isHttpUrl(path)) toSign.add(path)
    pathsByCart.get(row.cart_id)?.push(path)
  }

  const signed = new Map<string, string>()
  await Promise.all(
    [...toSign].map(async (path) => {
      const url = await createSignedUrlForStoragePath(supabase, path, 60 * 60 * 24)
      if (url) signed.set(path, url)
    }),
  )

  for (const id of cartIds) {
    const urls = (pathsByCart.get(id) ?? [])
      .map((p) => (isHttpUrl(p) ? p : signed.get(p) ?? null))
      .filter((u): u is string => Boolean(u))
    out.set(id, urls)
  }
  return out
}

function buildPurchaseCard(
  order: CartRow,
  thumbs: string[],
  outbound: ShipmentRow | undefined,
  opts: {historyFallback: boolean; nowMs: number},
): WebsiteOrderCard {
  const orderKind: MemberOrderKind = 'achat'
  const orderTypeLabel = memberOrderTypeLabel(orderKind, order.checkout_borrow_duration_days)
  const orderNumberCompact = formatOrderNumberCompact(order.id)
  const base = {
    id: order.id,
    orderKind,
    orderTypeLabel,
    orderNumberCompact,
    itemThumbUrls: thumbs,
    updatedAt: order.updated_at,
    appDetailPath: `/commande/${order.id}`,
  }

  if ((order.status ?? '').toLowerCase() === 'canceled') {
    return {...base, statusLabel: 'Commande annulée'}
  }

  const finished = isPurchaseFinishedForList(
    order.member_receipt_confirmed_at,
    outbound,
    opts.nowMs,
  )
  if (finished) {
    return {...base, statusLabel: 'Terminé'}
  }

  if (!outbound) {
    return {
      ...base,
      statusLabel: opts.historyFallback ? 'Commande archivée' : 'En préparation',
      showPulse: !opts.historyFallback,
    }
  }

  const phase = outboundStatusTitle(outbound.status)
  const st = outbound.status.toLowerCase()
  return {
    ...base,
    statusLabel: st === 'delivered' || st === 'closed' ? 'Reçu' : phase.title,
    showPulse: phase.pulse && st !== 'delivered' && st !== 'closed',
  }
}

/**
 * Commandes website = achats uniquement (locations / retours → app).
 * En cours / Historique alignés hub Échange app (réception validée → historique).
 */
export async function fetchMemberOrdersBundle(
  supabase: SupabaseClient,
  userId: string,
): Promise<MemberOrdersBundle> {
  const nowMs = Date.now()
  const [activePoolRes, canceledRes] = await Promise.all([
    supabase
      .from('carts')
      .select(
        'id,status,created_at,updated_at,member_receipt_confirmed_at,checkout_borrow_duration_days,checkout_purchase_mode,cart_order_stripe_invoices(guest_purchase_stripe_invoice_id)',
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .in('status', ['confirmed', 'archived', 'disputed'])
      .order('updated_at', {ascending: false})
      .limit(50),
    supabase
      .from('carts')
      .select(
        'id,status,created_at,updated_at,member_receipt_confirmed_at,checkout_borrow_duration_days,checkout_purchase_mode,cart_order_stripe_invoices(guest_purchase_stripe_invoice_id)',
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('status', 'canceled')
      .order('updated_at', {ascending: false})
      .limit(50),
  ])

  const activePoolAll = (activePoolRes.data ?? []) as CartRow[]
  const canceledAll = (canceledRes.data ?? []) as CartRow[]

  /** Site : uniquement les paniers achat (pas les locations app). */
  const activePoolCartRows = activePoolAll.filter((r) => resolveMemberOrderKindFromCart(r) === 'achat')
  const canceledCartRows = canceledAll.filter((r) => resolveMemberOrderKindFromCart(r) === 'achat')
  const allIds = [...new Set([...activePoolCartRows, ...canceledCartRows].map((r) => r.id))]

  const outboundByCart = new Map<string, ShipmentRow>()

  if (allIds.length > 0) {
    const {data: shipments} = await supabase
      .from('shipments')
      .select('cart_id,status,updated_at,delivered_at,context')
      .in('cart_id', allIds)
      .eq('context', 'cart_outbound')
      .is('deleted_at', null)
      .order('updated_at', {ascending: false})

    for (const row of (shipments ?? []) as ShipmentRow[]) {
      if (!outboundByCart.has(row.cart_id)) outboundByCart.set(row.cart_id, row)
    }
  }

  const thumbs = await fetchThumbsByCartIds(supabase, allIds)

  const isOngoing = (cartId: string) => {
    const order = activePoolCartRows.find((row) => row.id === cartId)
    if (!order) return false
    if (String(order.status ?? '').toLowerCase() === 'archived') {
      const finished = isPurchaseFinishedForList(
        order.member_receipt_confirmed_at,
        outboundByCart.get(cartId),
        nowMs,
      )
      if (finished) return false
    }
    return !isPurchaseFinishedForList(
      order.member_receipt_confirmed_at,
      outboundByCart.get(cartId),
      nowMs,
    )
  }

  const ongoingRows = activePoolCartRows.filter((r) => isOngoing(r.id))
  const finishedFromPool = activePoolCartRows.filter((r) => !isOngoing(r.id))

  const ongoing = ongoingRows.map((order) =>
    buildPurchaseCard(order, thumbs.get(order.id) ?? [], outboundByCart.get(order.id), {
      historyFallback: false,
      nowMs,
    }),
  )

  const history = [...finishedFromPool, ...canceledCartRows]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map((order) =>
      buildPurchaseCard(order, thumbs.get(order.id) ?? [], outboundByCart.get(order.id), {
        historyFallback: true,
        nowMs,
      }),
    )

  return {ongoing, history}
}

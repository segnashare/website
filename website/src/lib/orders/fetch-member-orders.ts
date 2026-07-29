import {createSignedUrlForStoragePath} from '@/lib/catalog/storage-signed-url'
import {getFirstPhotoStoragePath} from '@/lib/orders/item-photo-path'
import {
  formatOrderNumberCompact,
  memberOrderTypeLabel,
  resolveMemberOrderKindFromCart,
  type MemberOrderKind,
} from '@/lib/orders/member-order-kind'
import {
  isActiveReturnPhase,
  isReturnFinishedForList,
  outboundStatusTitle,
  returnStatusTitle,
} from '@/lib/orders/shipment-status-copy'
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
  returns: WebsiteOrderCard[]
}

type CartRow = {
  id: string
  status: string | null
  created_at: string
  updated_at: string
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
  context: string
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

function buildCard(
  order: CartRow,
  thumbs: string[],
  outbound: ShipmentRow | undefined,
  ret: ShipmentRow | undefined,
  opts: {historyFallback: boolean; preferReturn: boolean},
): WebsiteOrderCard {
  const orderKind = resolveMemberOrderKindFromCart(order)
  const orderTypeLabel = memberOrderTypeLabel(orderKind, order.checkout_borrow_duration_days)
  const orderNumberCompact = formatOrderNumberCompact(order.id)
  const base = {
    id: order.id,
    orderKind,
    orderTypeLabel,
    orderNumberCompact,
    itemThumbUrls: thumbs,
    updatedAt: order.updated_at,
  }

  if ((order.status ?? '').toLowerCase() === 'canceled') {
    return {
      ...base,
      statusLabel: 'Commande annulée',
      appDetailPath: `/commande/${order.id}`,
    }
  }

  if (opts.preferReturn && ret) {
    const phase = returnStatusTitle(ret.status)
    return {
      ...base,
      statusLabel: phase.title,
      showPulse: phase.pulse,
      appDetailPath: `/exchange/retour/${order.id}`,
    }
  }

  if (ret && isReturnFinishedForList(ret.status)) {
    const phase = returnStatusTitle(ret.status)
    return {
      ...base,
      statusLabel: phase.title,
      appDetailPath: `/exchange/retour/${order.id}`,
    }
  }

  if (!outbound) {
    return {
      ...base,
      statusLabel: opts.historyFallback ? 'Commande archivée' : 'Suivi non disponible',
      appDetailPath: `/commande/${order.id}`,
    }
  }

  const phase = outboundStatusTitle(outbound.status)
  const st = outbound.status.toLowerCase()
  return {
    ...base,
    statusLabel: phase.title,
    showPulse: phase.pulse,
    appDetailPath: st === 'delivered' ? `/exchange/emprunt/${order.id}` : `/commande/${order.id}`,
  }
}

/**
 * Agrège location + achat (même table `carts`) — règles En cours / Historique comme l’hub Échange.
 */
export async function fetchMemberOrdersBundle(
  supabase: SupabaseClient,
  userId: string,
): Promise<MemberOrdersBundle> {
  const [ongoingRes, historyRes] = await Promise.all([
    supabase
      .from('carts')
      .select(
        'id,status,created_at,updated_at,checkout_borrow_duration_days,checkout_purchase_mode,cart_order_stripe_invoices(guest_purchase_stripe_invoice_id)',
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('status', 'confirmed')
      .order('updated_at', {ascending: false}),
    supabase
      .from('carts')
      .select(
        'id,status,created_at,updated_at,checkout_borrow_duration_days,checkout_purchase_mode,cart_order_stripe_invoices(guest_purchase_stripe_invoice_id)',
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .in('status', ['archived', 'canceled'])
      .order('updated_at', {ascending: false})
      .limit(80),
  ])

  const ongoingCartRows = (ongoingRes.data ?? []) as CartRow[]
  const historyCartRows = (historyRes.data ?? []) as CartRow[]
  const allIds = [...new Set([...ongoingCartRows, ...historyCartRows].map((r) => r.id))]

  const outboundByCart = new Map<string, ShipmentRow>()
  const returnByCart = new Map<string, ShipmentRow>()

  if (allIds.length > 0) {
    const {data: shipments} = await supabase
      .from('shipments')
      .select('cart_id,status,updated_at,context')
      .in('cart_id', allIds)
      .in('context', ['cart_outbound', 'cart_return'])
      .is('deleted_at', null)
      .order('updated_at', {ascending: false})

    for (const row of (shipments ?? []) as ShipmentRow[]) {
      if (row.context === 'cart_outbound') {
        if (!outboundByCart.has(row.cart_id)) outboundByCart.set(row.cart_id, row)
      } else if (row.context === 'cart_return') {
        if (!returnByCart.has(row.cart_id)) returnByCart.set(row.cart_id, row)
      }
    }
  }

  const thumbs = await fetchThumbsByCartIds(supabase, allIds)

  const isOngoing = (cartId: string) => {
    const ret = returnByCart.get(cartId)
    return !ret || !isReturnFinishedForList(ret.status)
  }

  const ongoingRows = ongoingCartRows.filter((r) => isOngoing(r.id))
  const finishedFromConfirmed = ongoingCartRows.filter((r) => !isOngoing(r.id))

  const ongoing = ongoingRows.map((order) =>
    buildCard(order, thumbs.get(order.id) ?? [], outboundByCart.get(order.id), returnByCart.get(order.id), {
      historyFallback: false,
      preferReturn: false,
    }),
  )

  const history = [...finishedFromConfirmed, ...historyCartRows]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map((order) =>
      buildCard(order, thumbs.get(order.id) ?? [], outboundByCart.get(order.id), returnByCart.get(order.id), {
        historyFallback: true,
        preferReturn: false,
      }),
    )

  const returnCartIds = new Set<string>()
  for (const [cartId, ret] of returnByCart) {
    if (isActiveReturnPhase(ret.status) || isReturnFinishedForList(ret.status)) {
      returnCartIds.add(cartId)
    }
  }
  const cartById = new Map([...ongoingCartRows, ...historyCartRows].map((r) => [r.id, r]))
  const returns = [...returnCartIds]
    .map((id) => cartById.get(id))
    .filter((r): r is CartRow => Boolean(r))
    .sort((a, b) => {
      const ra = returnByCart.get(a.id)?.updated_at ?? a.updated_at
      const rb = returnByCart.get(b.id)?.updated_at ?? b.updated_at
      return new Date(rb).getTime() - new Date(ra).getTime()
    })
    .map((order) =>
      buildCard(order, thumbs.get(order.id) ?? [], outboundByCart.get(order.id), returnByCart.get(order.id), {
        historyFallback: true,
        preferReturn: true,
      }),
    )

  return {ongoing, history, returns}
}

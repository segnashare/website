import {createSignedUrlForStoragePath} from '@/lib/catalog/storage-signed-url'
import {catalogPurchasePriceCents} from '@/lib/catalog/catalog-borrow-price-label'
import {getFirstPhotoStoragePath} from '@/lib/orders/item-photo-path'
import {
  formatOrderNumberCompact,
  memberOrderTypeLabel,
  resolveMemberOrderKindFromCart,
  type MemberOrderKind,
} from '@/lib/orders/member-order-kind'
import {outboundStatusTitle, returnStatusTitle} from '@/lib/orders/shipment-status-copy'
import type {SupabaseClient} from '@supabase/supabase-js'

export type WebsiteOrderLine = {
  id: string
  itemId: string
  brand: string | null
  title: string
  sizeLabel: string | null
  priceCents: number
  photoUrl: string | null
}

export type WebsiteOrderAddress = {
  fullName: string
  street: string
  cityLine: string
  phone: string
  country: string
}

export type WebsiteOrderDetail = {
  cartId: string
  orderNumberCompact: string
  orderKind: MemberOrderKind
  orderTypeLabel: string
  createdAtIso: string
  cartStatus: string
  statusLabel: string
  showPulse?: boolean
  appDetailPath: string
  lines: WebsiteOrderLine[]
  address: WebsiteOrderAddress | null
  itemsSubtotalCents: number
  shippingCents: number | null
  totalCents: number | null
  invoiceUrl: string | null
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function addressFromProfile(
  profileData: Record<string, unknown>,
  firstName: string,
  lastName: string,
  usersPhone?: string | null,
): WebsiteOrderAddress | null {
  const location = (profileData.location ?? {}) as Record<string, unknown>
  const street =
    (typeof location.street === 'string' && location.street.trim()) ||
    (typeof location.label === 'string' && location.label.trim()) ||
    ''
  const postcode = typeof location.postcode === 'string' ? location.postcode.trim() : ''
  const city = typeof location.city === 'string' ? location.city.trim() : ''
  const cityLine = [postcode, city.toUpperCase()].filter(Boolean).join(' ')
  const phone =
    (typeof profileData.phone_e164 === 'string' && profileData.phone_e164.trim()) ||
    (typeof usersPhone === 'string' && usersPhone.trim()) ||
    ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  if (!street && !cityLine && !fullName) return null
  return {
    fullName: fullName || '—',
    street: street || '—',
    cityLine: cityLine || '—',
    phone: phone || '—',
    country: 'France',
  }
}

function parseEuroFromInvoice(data: unknown): {
  shippingCents: number | null
  totalCents: number | null
  invoiceUrl: string | null
} {
  if (data == null || typeof data !== 'object') {
    return {shippingCents: null, totalCents: null, invoiceUrl: null}
  }
  const o = data as Record<string, unknown>
  const amountTotal = Number(o.amount_total_cents)
  const shipping = Number(o.shipping_ttc_cents)
  const url =
    (typeof o.guest_purchase_stripe_invoice_hosted_url === 'string' &&
      o.guest_purchase_stripe_invoice_hosted_url.trim()) ||
    null
  return {
    shippingCents: Number.isFinite(shipping) ? Math.round(shipping) : null,
    totalCents: Number.isFinite(amountTotal) ? Math.round(amountTotal) : null,
    invoiceUrl: url,
  }
}

/**
 * Détail d’une commande membre (achat ou location) pour `/profil/commandes/[id]`.
 */
export async function fetchMemberOrderDetail(
  supabase: SupabaseClient,
  userId: string,
  cartId: string,
): Promise<WebsiteOrderDetail | null> {
  const {data: cartRaw} = await supabase
    .from('carts')
    .select(
      'id,status,created_at,updated_at,checkout_borrow_duration_days,checkout_purchase_mode,cart_order_stripe_invoices(guest_purchase_stripe_invoice_id,guest_purchase_stripe_invoice_hosted_url)',
    )
    .eq('id', cartId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle()

  const cart = cartRaw as {
    id: string
    status: string
    created_at: string
    checkout_borrow_duration_days?: number | null
    checkout_purchase_mode?: boolean | null
    cart_order_stripe_invoices?:
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null
  } | null

  if (!cart || !['confirmed', 'archived', 'canceled', 'disputed'].includes(cart.status)) {
    return null
  }

  const orderKind = resolveMemberOrderKindFromCart(cart)
  const orderTypeLabel = memberOrderTypeLabel(orderKind, cart.checkout_borrow_duration_days)
  const orderNumberCompact = formatOrderNumberCompact(cart.id)

  const [linesRes, outboundRes, returnRes, memberRes, profileRes, invoiceRpc] = await Promise.all([
    supabase
      .from('cart_items')
      .select(
        'id,item_id,items(id,title,price_points,photos,item_custom_brand_label,item_size_id,item_brands(label))',
      )
      .eq('cart_id', cartId)
      .is('deleted_at', null)
      .order('created_at', {ascending: true}),
    supabase
      .from('shipments')
      .select('status,updated_at')
      .eq('cart_id', cartId)
      .eq('context', 'cart_outbound')
      .is('deleted_at', null)
      .order('updated_at', {ascending: false})
      .limit(1)
      .maybeSingle(),
    supabase
      .from('shipments')
      .select('status,updated_at')
      .eq('cart_id', cartId)
      .eq('context', 'cart_return')
      .is('deleted_at', null)
      .order('updated_at', {ascending: false})
      .limit(1)
      .maybeSingle(),
    supabase.from('users').select('first_name,last_name,phone').eq('id', userId).maybeSingle(),
    supabase.from('user_profiles').select('profile_data').eq('user_id', userId).maybeSingle(),
    supabase.rpc('get_member_cart_order_stripe_invoice', {p_cart_id: cartId}),
  ])

  type ItemJoin = {
    id?: string
    title?: string | null
    price_points?: number | null
    photos?: unknown
    item_custom_brand_label?: string | null
    item_size_id?: string | null
    item_brands?: {label?: string | null} | null
  } | null

  const rawLines = (linesRes.data ?? []) as {
    id: string
    item_id: string
    items: ItemJoin | ItemJoin[]
  }[]

  const sizeIds = [
    ...new Set(
      rawLines
        .map((row) => {
          const item = Array.isArray(row.items) ? row.items[0] : row.items
          return item?.item_size_id?.trim()
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const sizeLabelById = new Map<string, string>()
  if (sizeIds.length > 0) {
    const {data: sizes} = await supabase.from('sizes').select('id,label').in('id', sizeIds)
    for (const row of (sizes ?? []) as {id?: string; label?: string | null}[]) {
      if (row.id?.trim() && row.label?.trim()) sizeLabelById.set(row.id.trim(), row.label.trim())
    }
  }

  const lines: WebsiteOrderLine[] = []
  for (const row of rawLines) {
    const item = Array.isArray(row.items) ? row.items[0] : row.items
    const brand =
      (typeof item?.item_brands?.label === 'string' && item.item_brands.label.trim()) ||
      (typeof item?.item_custom_brand_label === 'string' && item.item_custom_brand_label.trim()) ||
      null
    const title = (typeof item?.title === 'string' && item.title.trim()) || 'Pièce Segna'
    const sizeId = item?.item_size_id?.trim()
    const pricePoints = typeof item?.price_points === 'number' ? item.price_points : 0
    const rawPath = getFirstPhotoStoragePath(item?.photos ?? null)
    let photoUrl: string | null = null
    if (rawPath) {
      photoUrl = isHttpUrl(rawPath)
        ? rawPath
        : await createSignedUrlForStoragePath(supabase, rawPath, 60 * 60 * 24)
    }
    lines.push({
      id: row.id,
      itemId: row.item_id,
      brand,
      title,
      sizeLabel: sizeId ? sizeLabelById.get(sizeId) ?? null : null,
      priceCents: catalogPurchasePriceCents(pricePoints),
      photoUrl,
    })
  }

  const outbound = outboundRes.data as {status?: string} | null
  const ret = returnRes.data as {status?: string} | null
  let statusLabel = 'Suivi commande'
  let showPulse: boolean | undefined
  let appDetailPath = `/commande/${cart.id}`

  if ((cart.status ?? '').toLowerCase() === 'canceled') {
    statusLabel = 'Commande annulée'
  } else if (ret?.status) {
    const phase = returnStatusTitle(ret.status)
    statusLabel = phase.title
    showPulse = phase.pulse
    appDetailPath = `/exchange/retour/${cart.id}`
  } else if (outbound?.status) {
    const phase = outboundStatusTitle(outbound.status)
    statusLabel = phase.title
    showPulse = phase.pulse
    if (outbound.status.toLowerCase() === 'delivered') {
      appDetailPath = `/exchange/emprunt/${cart.id}`
    }
  } else if ((cart.status ?? '').toLowerCase() === 'archived') {
    statusLabel = 'Commande terminée'
  }

  const member = memberRes.data as {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
  } | null
  const profile = profileRes.data as {profile_data?: Record<string, unknown> | null} | null
  const address = addressFromProfile(
    (profile?.profile_data ?? {}) as Record<string, unknown>,
    typeof member?.first_name === 'string' ? member.first_name.trim() : '',
    typeof member?.last_name === 'string' ? member.last_name.trim() : '',
    member?.phone,
  )

  const nestedInvoice = Array.isArray(cart.cart_order_stripe_invoices)
    ? cart.cart_order_stripe_invoices[0]
    : cart.cart_order_stripe_invoices
  const fromJoin = parseEuroFromInvoice(nestedInvoice)
  const fromRpc = parseEuroFromInvoice(invoiceRpc.data)
  const shippingCents = fromRpc.shippingCents ?? fromJoin.shippingCents
  const totalCents = fromRpc.totalCents ?? fromJoin.totalCents
  const invoiceUrl = fromRpc.invoiceUrl ?? fromJoin.invoiceUrl
  const itemsSubtotalCents = lines.reduce((sum, line) => sum + line.priceCents, 0)

  return {
    cartId: cart.id,
    orderNumberCompact,
    orderKind,
    orderTypeLabel,
    createdAtIso: cart.created_at,
    cartStatus: cart.status,
    statusLabel,
    showPulse,
    appDetailPath,
    lines,
    address,
    itemsSubtotalCents,
    shippingCents,
    totalCents: totalCents ?? itemsSubtotalCents + (shippingCents ?? 0),
    invoiceUrl,
  }
}

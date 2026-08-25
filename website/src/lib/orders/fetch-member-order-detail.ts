import {createSignedUrlForStoragePath} from '@/lib/catalog/storage-signed-url'
import {catalogPurchasePriceCents} from '@/lib/catalog/catalog-borrow-price-label'
import {buildMemberOrderTimeline, type OrderTimelineEntry} from '@/lib/orders/build-order-timeline'
import {getFirstPhotoStoragePath} from '@/lib/orders/item-photo-path'
import {
  formatOrderNumberCompact,
  memberOrderTypeLabel,
  resolveMemberOrderKindFromCart,
  type MemberOrderKind,
} from '@/lib/orders/member-order-kind'
import {
  isExpressOutboundShipment,
  isShipmentProgressActiveStatus,
  normalizeOutboundShipmentStatusForUi,
  resolveShipmentProgressDeliveryKind,
  shipmentActualDeliveryScheduleLabel,
  shipmentEstimatedDeliveryRangeLabel,
  shipmentProgressDetailLine,
  shipmentProgressTitle,
  type ShipmentProgressDeliveryKind,
} from '@/lib/orders/shipment-progress'
import {outboundStatusTitle, returnStatusTitle} from '@/lib/orders/shipment-status-copy'
import {resolveOutboundTrackingHref} from '@/lib/shipping/carrier-tracking-url'
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
  /** Relais / domicile issu de l’expédition. */
  kind?: 'home' | 'relay' | 'profile'
  methodTitle?: string | null
}

export type WebsiteOrderShipmentProgress = {
  status: string
  title: string
  detailLine: string
  scheduleLabel: string
  deliveryKind: ShipmentProgressDeliveryKind
  showProgress: boolean
  trackingNumber: string | null
  trackingHref: string | null
  trackingLabel: string
  isExpressOutbound: boolean
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
  shipmentProgress: WebsiteOrderShipmentProgress | null
  timeline: OrderTimelineEntry[]
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
    kind: 'profile',
  }
}

function addressFromShipmentDestination(opts: {
  destinationType: string | null
  line1: string | null
  providerPointId: string | null
  metadata: Record<string, unknown> | null
  profileFallback: WebsiteOrderAddress | null
}): WebsiteOrderAddress | null {
  const destType = (opts.destinationType ?? '').trim().toLowerCase()
  const meta = opts.metadata ?? {}
  const methodTitle =
    (typeof meta.sendcloud_outbound_method_title === 'string' &&
      meta.sendcloud_outbound_method_title.trim()) ||
    null
  const line1 = opts.line1?.trim() || null

  if (destType === 'home' && line1) {
    const parts = line1.split(',').map((p) => p.trim()).filter(Boolean)
    const street = parts[0] ?? line1
    const cityLine = parts.slice(1).join(', ') || opts.profileFallback?.cityLine || '—'
    return {
      fullName: opts.profileFallback?.fullName || '—',
      street,
      cityLine,
      phone: opts.profileFallback?.phone || '—',
      country: 'France',
      kind: 'home',
      methodTitle,
    }
  }

  if (destType === 'pickup_point') {
    const relayLabel =
      (typeof meta.relay_label === 'string' && meta.relay_label.trim()) ||
      (typeof meta.point_name === 'string' && meta.point_name.trim()) ||
      (typeof meta.name === 'string' && meta.name.trim()) ||
      methodTitle ||
      'Point relais'
    const pointId = opts.providerPointId?.trim() || null
    return {
      fullName: opts.profileFallback?.fullName || '—',
      street: relayLabel,
      cityLine: pointId ? `Réf. ${pointId.replace(/^sc:\d+@/, '')}` : opts.profileFallback?.cityLine || '—',
      phone: opts.profileFallback?.phone || '—',
      country: 'France',
      kind: 'relay',
      methodTitle: methodTitle ?? 'Livraison en relais',
    }
  }

  return opts.profileFallback
}

function parseEuroFromInvoice(data: unknown): {
  shippingCents: number | null
  totalCents: number | null
  invoiceUrl: string | null
  checkoutDeliveryChannel: string | null
  checkoutHomeSpeed: string | null
} {
  if (data == null || typeof data !== 'object') {
    return {
      shippingCents: null,
      totalCents: null,
      invoiceUrl: null,
      checkoutDeliveryChannel: null,
      checkoutHomeSpeed: null,
    }
  }
  const o = data as Record<string, unknown>
  const amountTotal = Number(o.amount_total_cents)
  const shipping = Number(o.shipping_ttc_cents)
  const url =
    (typeof o.guest_purchase_stripe_invoice_hosted_url === 'string' &&
      o.guest_purchase_stripe_invoice_hosted_url.trim()) ||
    null
  const channel =
    typeof o.checkout_delivery_channel === 'string' ? o.checkout_delivery_channel.trim().toLowerCase() : null
  const speed =
    typeof o.checkout_home_speed === 'string' ? o.checkout_home_speed.trim().toLowerCase() : null
  return {
    shippingCents: Number.isFinite(shipping) ? Math.round(shipping) : null,
    totalCents: Number.isFinite(amountTotal) ? Math.round(amountTotal) : null,
    invoiceUrl: url,
    checkoutDeliveryChannel: channel || null,
    checkoutHomeSpeed: speed || null,
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
      'id,status,created_at,updated_at,checkout_borrow_duration_days,checkout_purchase_mode,cart_order_stripe_invoices(guest_purchase_stripe_invoice_id,guest_purchase_stripe_invoice_hosted_url,checkout_delivery_channel,checkout_home_speed)',
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
  const isPurchase = orderKind === 'achat'
  const orderTypeLabel = memberOrderTypeLabel(orderKind, cart.checkout_borrow_duration_days)
  const orderNumberCompact = formatOrderNumberCompact(cart.id)

  const [linesRes, outboundRes, returnRes, historyRes, memberRes, profileRes, invoiceRpc] =
    await Promise.all([
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
        .select(
          'status,created_at,updated_at,ready_at,delivered_at,tracking_number,member_tracking_url,shipment_providers(code),shipment_destinations(destination_type,line1,provider_point_id,metadata)',
        )
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
      supabase
        .from('cart_status_history')
        .select('created_at,to_status,reason')
        .eq('cart_id', cartId)
        .order('created_at', {ascending: true})
        .limit(40),
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

  const shipRow = outboundRes.data as Record<string, unknown> | null
  const outboundStatus =
    typeof shipRow?.status === 'string' ? shipRow.status : null
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
  } else if (outboundStatus) {
    if (isPurchase) {
      statusLabel = shipmentProgressTitle(outboundStatus, true)
      const st = normalizeOutboundShipmentStatusForUi(outboundStatus)
      showPulse = st === 'pending' || st === 'in_transit_in' || st === 'dropped_in'
    } else {
      const phase = outboundStatusTitle(outboundStatus)
      statusLabel = phase.title
      showPulse = phase.pulse
      if (outboundStatus.toLowerCase() === 'delivered') {
        appDetailPath = `/exchange/emprunt/${cart.id}`
      }
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
  const profileAddress = addressFromProfile(
    (profile?.profile_data ?? {}) as Record<string, unknown>,
    typeof member?.first_name === 'string' ? member.first_name.trim() : '',
    typeof member?.last_name === 'string' ? member.last_name.trim() : '',
    member?.phone,
  )

  const destEmb = shipRow?.shipment_destinations
  const destList = Array.isArray(destEmb) ? destEmb : destEmb ? [destEmb] : []
  const destRow = (destList.find((d) => d && typeof d === 'object') ?? null) as {
    destination_type?: string | null
    line1?: string | null
    provider_point_id?: string | null
    metadata?: Record<string, unknown> | null
  } | null

  const address = addressFromShipmentDestination({
    destinationType: destRow?.destination_type ?? null,
    line1: destRow?.line1 ?? null,
    providerPointId: destRow?.provider_point_id ?? null,
    metadata: destRow?.metadata ?? null,
    profileFallback: profileAddress,
  })

  const nestedInvoice = Array.isArray(cart.cart_order_stripe_invoices)
    ? cart.cart_order_stripe_invoices[0]
    : cart.cart_order_stripe_invoices
  const fromJoin = parseEuroFromInvoice(nestedInvoice)
  const fromRpc = parseEuroFromInvoice(invoiceRpc.data)
  const shippingCents = fromRpc.shippingCents ?? fromJoin.shippingCents
  const totalCents = fromRpc.totalCents ?? fromJoin.totalCents
  const invoiceUrl = fromRpc.invoiceUrl ?? fromJoin.invoiceUrl
  const checkoutDeliveryChannel =
    fromRpc.checkoutDeliveryChannel ?? fromJoin.checkoutDeliveryChannel
  const checkoutHomeSpeed = fromRpc.checkoutHomeSpeed ?? fromJoin.checkoutHomeSpeed
  const itemsSubtotalCents = lines.reduce((sum, line) => sum + line.priceCents, 0)

  const provEmb = shipRow?.shipment_providers
  const provObj = Array.isArray(provEmb) ? provEmb[0] : provEmb
  const outboundProviderCode =
    provObj && typeof provObj === 'object' && typeof (provObj as {code?: unknown}).code === 'string'
      ? (provObj as {code: string}).code.trim().toLowerCase()
      : null

  const trackingNumber =
    typeof shipRow?.tracking_number === 'string' && shipRow.tracking_number.trim()
      ? shipRow.tracking_number.trim()
      : null
  const memberTrackingUrl =
    typeof shipRow?.member_tracking_url === 'string' && shipRow.member_tracking_url.trim()
      ? shipRow.member_tracking_url.trim()
      : null
  const readyAt =
    typeof shipRow?.ready_at === 'string' && shipRow.ready_at.trim() ? shipRow.ready_at.trim() : null
  const deliveredAt =
    typeof shipRow?.delivered_at === 'string' && shipRow.delivered_at.trim()
      ? shipRow.delivered_at.trim()
      : null
  const shipCreatedAt =
    typeof shipRow?.created_at === 'string' ? shipRow.created_at : cart.created_at
  const shipUpdatedAt =
    typeof shipRow?.updated_at === 'string' ? shipRow.updated_at : cart.created_at

  let shipmentProgress: WebsiteOrderShipmentProgress | null = null
  if (outboundStatus && (cart.status ?? '').toLowerCase() !== 'canceled') {
    const isExpress = isExpressOutboundShipment({
      outboundProviderCode,
      memberTrackingUrl,
      checkoutDeliveryChannel,
      checkoutHomeSpeed,
    })
    const deliveryKind = resolveShipmentProgressDeliveryKind({
      isExpressOutbound: isExpress,
      outboundProviderCode,
      checkoutDeliveryChannel,
      checkoutHomeSpeed,
    })
    const hideTrackingWhilePending = !isExpress && normalizeOutboundShipmentStatusForUi(outboundStatus) === 'pending'
    const tracking = hideTrackingWhilePending
      ? {trackingNumber: null, trackingHref: null, trackingLabel: 'Suivre le colis'}
      : resolveOutboundTrackingHref({
          trackingNumber,
          memberTrackingUrl,
          outboundProviderCode,
          isExpressOutbound: isExpress,
        })

    const estimate = shipmentEstimatedDeliveryRangeLabel({
      createdAtIso: cart.created_at,
      readyAtIso: readyAt ?? shipCreatedAt,
      deliveryKind,
    })
    const scheduleLabel =
      shipmentActualDeliveryScheduleLabel({
        status: outboundStatus,
        deliveredAtIso: deliveredAt,
        updatedAtIso: shipUpdatedAt,
      }) ?? estimate

    shipmentProgress = {
      status: outboundStatus,
      title: shipmentProgressTitle(outboundStatus, isPurchase),
      detailLine: shipmentProgressDetailLine(outboundStatus),
      scheduleLabel,
      deliveryKind,
      showProgress: isShipmentProgressActiveStatus(outboundStatus),
      trackingNumber: tracking.trackingNumber,
      trackingHref: tracking.trackingHref,
      trackingLabel: tracking.trackingLabel,
      isExpressOutbound: isExpress,
    }
  }

  const historyRows =
    historyRes.error == null
      ? ((historyRes.data ?? []) as {created_at: string; to_status: string; reason: string | null}[])
      : []

  const timeline = buildMemberOrderTimeline(
    cart.created_at,
    historyRows,
    outboundStatus
      ? {
          created_at: shipCreatedAt,
          updated_at: shipUpdatedAt,
          status: outboundStatus,
          delivered_at: deliveredAt,
        }
      : null,
    isPurchase,
  )

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
    shipmentProgress,
    timeline,
  }
}

/** Progression livraison — port léger de l’app mobile `shipment-progress`. */

export type ShipmentProgressStepKey = 'prep' | 'ready' | 'transit' | 'relay' | 'received'

export type ShipmentProgressStep = {
  key: ShipmentProgressStepKey
  weight: number
}

export type ShipmentProgressDeliveryKind = 'express' | 'chrono' | 'standard'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const SEGNA_OUTBOUND_PREP_ESTIMATE_MINUTES = 30
const SEGNA_TZ = 'Europe/Paris'

export function normalizeOutboundShipmentStatusForUi(status: string): string {
  const s = status.trim().toLowerCase()
  if (s === 'in_transit') return 'in_transit_in'
  return s
}

export function resolveShipmentProgressDeliveryKind(opts: {
  isExpressOutbound: boolean
  outboundProviderCode?: string | null
  checkoutDeliveryChannel?: string | null
  checkoutHomeSpeed?: string | null
}): ShipmentProgressDeliveryKind {
  if (opts.isExpressOutbound) return 'express'
  const provider = (opts.outboundProviderCode ?? '').trim().toLowerCase()
  const speed = (opts.checkoutHomeSpeed ?? '').trim().toLowerCase()
  const channel = (opts.checkoutDeliveryChannel ?? '').trim().toLowerCase()
  if (speed === 'uber_direct' || speed === 'priority') return 'express'
  if (
    provider.includes('chrono') ||
    provider === 'chronopost' ||
    speed.includes('chrono') ||
    (channel === 'home' && /chrono|18/.test(speed))
  ) {
    return 'chrono'
  }
  return 'standard'
}

export function shipmentProgressSteps(
  deliveryKind: ShipmentProgressDeliveryKind,
): ShipmentProgressStep[] {
  const prep = 1
  const ready = 1.2
  const transit = deliveryKind === 'express' ? 2 : deliveryKind === 'chrono' ? 3.5 : 6
  const relay = 2
  const received = 0.8

  if (deliveryKind === 'express') {
    return [
      {key: 'prep', weight: prep},
      {key: 'ready', weight: ready},
      {key: 'transit', weight: transit},
      {key: 'received', weight: received},
    ]
  }
  return [
    {key: 'prep', weight: prep},
    {key: 'ready', weight: ready},
    {key: 'transit', weight: transit},
    {key: 'relay', weight: relay},
    {key: 'received', weight: received},
  ]
}

export function shipmentProgressActiveStepIndex(
  status: string | null | undefined,
  deliveryKind: ShipmentProgressDeliveryKind = 'standard',
): number | null {
  if (!status) return null
  const express = deliveryKind === 'express'
  switch (normalizeOutboundShipmentStatusForUi(status)) {
    case 'pending':
      return 0
    case 'ready':
      return 1
    case 'dropped_in':
    case 'in_transit_in':
    case 'in_transit_out':
      return 2
    case 'dropped_out':
      return express ? 2 : 3
    case 'delivered':
    case 'closed':
      return null
    default:
      return 0
  }
}

export function isShipmentProgressActiveStatus(status: string | null | undefined): boolean {
  if (!status) return false
  const s = normalizeOutboundShipmentStatusForUi(status)
  return (
    s === 'pending' ||
    s === 'ready' ||
    s === 'dropped_in' ||
    s === 'dropped_out' ||
    s === 'in_transit_in' ||
    s === 'in_transit_out' ||
    s === 'delivered'
  )
}

function formatDeliveryDateTimeParis(iso: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const datePart = d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: SEGNA_TZ,
  })
  const timePart = d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SEGNA_TZ,
  })
  if (!datePart.trim()) return null
  return `${datePart} à ${timePart}`
}

export function shipmentActualDeliveryScheduleLabel(opts: {
  status: string
  deliveredAtIso?: string | null
  updatedAtIso?: string | null
}): string | null {
  const s = normalizeOutboundShipmentStatusForUi(opts.status)
  if (s !== 'dropped_out' && s !== 'delivered' && s !== 'closed') return null
  const iso = opts.deliveredAtIso?.trim() || opts.updatedAtIso?.trim() || null
  if (!iso) return null
  const when = formatDeliveryDateTimeParis(iso)
  if (!when) return null
  return `Livré le ${when}`
}

export function shipmentProgressTitle(status: string, isPurchase = false): string {
  const s = normalizeOutboundShipmentStatusForUi(status)
  switch (s) {
    case 'pending':
      return 'En préparation'
    case 'ready':
      return 'En attente d’expédition'
    case 'dropped_in':
      return 'Colis en transit'
    case 'dropped_out':
      return 'Disponible au relais'
    case 'in_transit_in':
      return 'En route vers toi'
    case 'in_transit_out':
      return 'Retour en transit'
    case 'delivered':
    case 'closed':
      return isPurchase ? 'Livré' : 'Reçu'
    default:
      return 'Suivi commande'
  }
}

function shortDeliveryDate(ms: number): string {
  return new Date(ms).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: SEGNA_TZ,
  })
}

export function shipmentEstimatedDeliveryRangeLabel(opts: {
  createdAtIso: string
  readyAtIso?: string | null
  deliveryKind: ShipmentProgressDeliveryKind
}): string {
  const createdMs = Date.parse(opts.createdAtIso)
  const readyMs = opts.readyAtIso ? Date.parse(opts.readyAtIso) : Number.NaN
  const baseMs = Number.isFinite(readyMs)
    ? readyMs
    : Number.isFinite(createdMs)
      ? createdMs
      : Date.now()

  if (opts.deliveryKind === 'express') {
    const fromMs = Number.isFinite(readyMs)
      ? readyMs
      : baseMs + SEGNA_OUTBOUND_PREP_ESTIMATE_MINUTES * 60 * 1000
    const toMs = fromMs + MS_PER_DAY
    return `Livraison estimée entre le ${shortDeliveryDate(fromMs)} et le ${shortDeliveryDate(toMs)}`
  }

  if (opts.deliveryKind === 'chrono') {
    const fromMs = baseMs + 1 * MS_PER_DAY
    const toMs = baseMs + 2 * MS_PER_DAY
    return `Livraison estimée entre le ${shortDeliveryDate(fromMs)} et le ${shortDeliveryDate(toMs)}`
  }

  const fromMs = baseMs + 2 * MS_PER_DAY
  const toMs = baseMs + 4 * MS_PER_DAY
  return `Livraison estimée entre le ${shortDeliveryDate(fromMs)} et le ${shortDeliveryDate(toMs)}`
}

export function shipmentProgressDetailLine(status: string): string {
  switch (normalizeOutboundShipmentStatusForUi(status)) {
    case 'pending':
      return 'Le colis est en préparation chez Segna.'
    case 'ready':
      return 'Le colis est en attente d’expédition.'
    case 'dropped_in':
      return 'Le colis est en transit vers le point de livraison.'
    case 'dropped_out':
      return 'Le colis est disponible au point relais.'
    case 'in_transit_in':
      return 'Le colis est en route vers toi.'
    case 'in_transit_out':
      return 'Un retour est en route vers Segna.'
    case 'delivered':
      return 'Le colis a été reçu.'
    case 'closed':
      return 'Ce suivi est clos.'
    default:
      return 'Suivi de ton colis en cours.'
  }
}

export function isExpressOutboundShipment(opts: {
  outboundProviderCode?: string | null
  memberTrackingUrl?: string | null
  checkoutDeliveryChannel?: string | null
  checkoutHomeSpeed?: string | null
}): boolean {
  const provider = (opts.outboundProviderCode ?? '').trim().toLowerCase()
  if (provider === 'coursier' || provider === 'uber_direct') return true
  if (opts.memberTrackingUrl && /uber\.com|coursier/i.test(opts.memberTrackingUrl)) return true
  const channel = (opts.checkoutDeliveryChannel ?? '').trim().toLowerCase()
  const speed = (opts.checkoutHomeSpeed ?? '').trim().toLowerCase()
  if (channel === 'home' && (speed === 'uber_direct' || speed === 'priority')) return true
  return false
}

/** Libellés phase aller — alignés app `member-outbound-shipment-copy`. */

function normalizeOutbound(status: string): string {
  const s = status.trim().toLowerCase()
  if (s === 'in_transit') return 'in_transit_in'
  return s
}

export function outboundStatusTitle(status: string): {title: string; pulse?: boolean} {
  switch (normalizeOutbound(status)) {
    case 'pending':
      return {title: 'En préparation', pulse: true}
    case 'ready':
      return {title: 'Prêt à l’expédition'}
    case 'dropped_in':
      return {title: 'Colis en transit'}
    case 'dropped_out':
      return {title: 'Colis disponible au relais'}
    case 'in_transit_in':
      return {title: 'En route vers toi', pulse: true}
    case 'in_transit_out':
      return {title: 'Retour en transit'}
    case 'delivered':
      return {title: 'Échange en cours'}
    case 'closed':
      return {title: 'Expédition terminée'}
    default:
      return {title: 'Suivi commande'}
  }
}

const RETURN_FINISHED = new Set([
  'dropped_out',
  'in_transit_out',
  'dropped_in',
  'returned',
  'en_verification',
  'return_validated',
  'closed',
])

const RETURN_COMPLETE = new Set(['return_validated', 'closed'])

function normalizeReturn(status: string | null | undefined): string | null {
  if (!status?.trim()) return null
  const s = status.trim().toLowerCase()
  if (s === 'delivered') return 'returned'
  if (s === 'in_transit' || s === 'in_transit_in') return 'in_transit_out'
  return s
}

/** Historique liste : dépôt relais effectué. */
export function isReturnFinishedForList(status: string | null | undefined): boolean {
  const s = normalizeReturn(status)
  return Boolean(s && RETURN_FINISHED.has(s))
}

/** Retour encore suivi côté membre (onglet Retours). */
export function isActiveReturnPhase(status: string | null | undefined): boolean {
  const s = normalizeReturn(status)
  if (!s) return false
  return !RETURN_COMPLETE.has(s)
}

export function returnStatusTitle(status: string): {title: string; pulse?: boolean} {
  const s = normalizeReturn(status) ?? status.toLowerCase()
  switch (s) {
    case 'pending':
      return {title: 'Prépare ton retour', pulse: true}
    case 'ready':
      return {title: 'Étiquette retour prête'}
    case 'dropped_out':
      return {title: 'Dépôt relais enregistré'}
    case 'in_transit_out':
      return {title: 'Retour en transit'}
    case 'dropped_in':
      return {title: 'Échange terminé'}
    case 'returned':
    case 'en_verification':
      return {title: 'Reçu chez Segna'}
    case 'return_validated':
      return {title: 'Retour validé'}
    case 'closed':
      return {title: 'Retour clos'}
    case 'failed':
      return {title: 'Retour en difficulté', pulse: true}
    default:
      return {title: 'Suivi retour'}
  }
}

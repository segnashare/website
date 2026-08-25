/** URLs de suivi transporteur (aligné app `intake-carrier-tracking` / Mondial Relay). */

export function buildChronopostTrackingUrl(trackingNumber: string): string | null {
  const num = trackingNumber.trim()
  if (!num) return null
  return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(num)}&langue=fr`
}

export function buildMondialRelayTrackingUrl(trackingNumber: string): string | null {
  const t = trackingNumber.trim()
  if (!t) return null
  return `https://www.mondialrelay.fr/suivi-de-colis/?NumeroExpedition=${encodeURIComponent(t)}`
}

function isSendcloudLabelOrInternalUrl(url: string): boolean {
  const u = url.trim().toLowerCase()
  if (!u.startsWith('http')) return false
  return (
    u.includes('panel.sendcloud') ||
    u.includes('sendcloud.sc/api') ||
    u.includes('api.sendcloud') ||
    u.includes('/documents/label') ||
    (u.includes('/parcels/') && u.includes('/label'))
  )
}

/**
 * Lien suivi membre : URL transporteur déjà connue, sinon Chronopost / MR selon le n°.
 */
export function resolveOutboundTrackingHref(opts: {
  trackingNumber?: string | null
  memberTrackingUrl?: string | null
  outboundProviderCode?: string | null
  isExpressOutbound?: boolean
}): {trackingNumber: string | null; trackingHref: string | null; trackingLabel: string} {
  const num = opts.trackingNumber?.trim() || null
  const memberUrl = opts.memberTrackingUrl?.trim() || null
  const provider = (opts.outboundProviderCode ?? '').trim().toLowerCase()
  const express = Boolean(opts.isExpressOutbound)

  if (express) {
    const href =
      memberUrl && !isSendcloudLabelOrInternalUrl(memberUrl) && /^https?:\/\//i.test(memberUrl)
        ? memberUrl
        : null
    return {
      trackingNumber: num,
      trackingHref: href,
      trackingLabel: 'Voir le suivi Coursier.fr',
    }
  }

  if (memberUrl && !isSendcloudLabelOrInternalUrl(memberUrl) && /^https?:\/\//i.test(memberUrl)) {
    return {
      trackingNumber: num,
      trackingHref: memberUrl,
      trackingLabel: provider.includes('chrono') ? 'Suivre sur Chronopost' : 'Suivre le colis',
    }
  }

  if (!num) {
    return {trackingNumber: null, trackingHref: null, trackingLabel: 'Suivre le colis'}
  }

  if (
    provider.includes('chrono') ||
    /^XT/i.test(num) ||
    /^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(num)
  ) {
    return {
      trackingNumber: num,
      trackingHref: buildChronopostTrackingUrl(num),
      trackingLabel: 'Suivre sur Chronopost',
    }
  }

  return {
    trackingNumber: num,
    trackingHref: buildMondialRelayTrackingUrl(num),
    trackingLabel: 'Suivre le colis',
  }
}

export type ClientPlatform = 'ios' | 'android' | 'desktop'

/** Détection légère UA (client only). */
export function detectClientPlatform(): ClientPlatform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  // iPadOS 13+ se présente parfois comme MacIntel + touch.
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

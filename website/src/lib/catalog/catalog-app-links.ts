/** Liens app Segna (placeholders marketing — pas de checkout site). */
export const SEGNA_APP_BASE_URL = (process.env.NEXT_PUBLIC_SEGNA_APP_URL || 'https://app.segnashare.com').replace(
  /\/+$/,
  '',
)

export function catalogItemPagePath(itemId: string): string {
  return `/catalogue/piece/${itemId}`
}

export function catalogItemAppHref(itemId?: string | null): string {
  if (itemId?.trim()) return `${SEGNA_APP_BASE_URL}/shop?item=${encodeURIComponent(itemId.trim())}`
  return `${SEGNA_APP_BASE_URL}/shop`
}

export function catalogAppSignupHref(): string {
  return `${SEGNA_APP_BASE_URL}/auth/sign-up/email`
}

import {
  ANALYTICS_SURFACES,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from '@segna/analytics'
import posthog from 'posthog-js'

const SIGNED_UP_GUARD_KEY = 'segna:ph:signed_up'

export function trackWebsiteEvent<E extends AnalyticsEventName>(
  event: E,
  properties?: AnalyticsEventProperties[E],
  options?: {insertId?: string},
): void {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) return
  if (!posthog.__loaded) return
  posthog.capture(event, {
    surface: ANALYTICS_SURFACES.website,
    ...(properties ?? {}),
    ...(options?.insertId ? {$insert_id: options.insertId} : {}),
  })
}

/** Fire at most once per browser tab (signup). */
export function trackWebsiteSignupOnce(
  properties: AnalyticsEventProperties['user_signed_up'],
): void {
  if (typeof window === 'undefined') return
  try {
    if (sessionStorage.getItem(SIGNED_UP_GUARD_KEY) === '1') return
    sessionStorage.setItem(SIGNED_UP_GUARD_KEY, '1')
  } catch {
    // ignore
  }
  trackWebsiteEvent('user_signed_up', properties)
}

export function identifyWebsiteUser(userId: string, email?: string | null): void {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) return
  if (!posthog.__loaded) return
  posthog.identify(userId, {
    email: email ?? undefined,
  })
}

export function resetWebsiteAnalytics(): void {
  if (typeof window === 'undefined') return
  if (!posthog.__loaded) return
  posthog.reset()
}

'use client'

import {ANALYTICS_SURFACES} from '@segna/analytics'
import {Suspense, useEffect, useState} from 'react'
import {usePathname, useSearchParams} from 'next/navigation'
import posthog from 'posthog-js'
import {PostHogProvider as PostHogClientProvider} from 'posthog-js/react'

import {PostHogAuthTracker} from '@/components/analytics/PostHogAuthTracker'

type CookiebotConsent = {
  statistics?: boolean
}

type CookiebotApi = {
  consent?: CookiebotConsent
}

function hasStatisticsConsent(): boolean {
  if (typeof window === 'undefined') return false
  const cookiebot = (window as Window & {Cookiebot?: CookiebotApi}).Cookiebot
  return Boolean(cookiebot?.consent?.statistics)
}

function getApiHost(): string {
  return (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com').replace(/\/+$/, '')
}

function initPostHog(): boolean {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()
  const posthogWindow = window as Window & {
    __segnaPosthogLoaded?: boolean
    posthog?: typeof posthog
  }

  if (!apiKey) return false

  if (!posthog.__loaded) {
    // Host absolu : un POSTHOG_HOST vide cassait le rewrite /ingest (avalé par [slug]).
    posthog.init(apiKey, {
      api_host: getApiHost(),
      ui_host: 'https://eu.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]',
      },
      disable_surveys: true,
      debug: process.env.NODE_ENV === 'development',
    })
    posthog.register({surface: ANALYTICS_SURFACES.website})
  }

  posthogWindow.posthog = posthog
  posthogWindow.__segnaPosthogLoaded = true
  return posthog.__loaded
}

function PostHogPageView({enabled}: {enabled: boolean}): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!enabled || !pathname || !posthog.__loaded) return

    const query = searchParams.toString()
    const url = `${window.location.origin}${pathname}${query ? `?${query}` : ''}`
    posthog.capture('$pageview', {
      $current_url: url,
      surface: ANALYTICS_SURFACES.website,
    })
  }, [enabled, pathname, searchParams])

  return null
}

export function PostHogProvider({children}: {children: React.ReactNode}) {
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()
    if (!apiKey) return

    const tryInit = () => {
      if (!hasStatisticsConsent()) {
        setCapturing(false)
        if (posthog.__loaded) posthog.opt_out_capturing()
        return
      }

      if (!initPostHog()) return

      posthog.opt_in_capturing()
      setCapturing(true)
    }

    const onDecline = () => {
      setCapturing(false)
      if (posthog.__loaded) posthog.opt_out_capturing()
    }

    tryInit()
    window.addEventListener('CookiebotOnAccept', tryInit)
    window.addEventListener('CookiebotOnDecline', onDecline)
    window.addEventListener('CookiebotOnConsentReady', tryInit)

    return () => {
      window.removeEventListener('CookiebotOnAccept', tryInit)
      window.removeEventListener('CookiebotOnDecline', onDecline)
      window.removeEventListener('CookiebotOnConsentReady', tryInit)
    }
  }, [])

  return (
    <PostHogClientProvider client={posthog}>
      <PostHogAuthTracker />
      <Suspense fallback={null}>
        <PostHogPageView enabled={capturing} />
      </Suspense>
      {children}
    </PostHogClientProvider>
  )
}

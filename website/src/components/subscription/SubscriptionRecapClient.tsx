'use client'

import {CheckoutSignupOnboardingModal} from '@/components/auth/CheckoutSignupOnboardingModal'
import type {CheckoutOnboardingStep} from '@/lib/auth/checkout-onboarding-resume'
import {resolveCheckoutOnboardingResume} from '@/lib/auth/checkout-onboarding-resume'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {WEBSITE_SUBSCRIPTION_RECAP_PATH} from '@/lib/cart/paths'
import {segnaAppDownloadHref} from '@/lib/catalog/catalog-app-links'
import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'
import {WaveDotsLoader} from '@/components/ui/WaveDotsLoader'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useRef, useState} from 'react'
import {CheckoutPhoneVerifyModal} from './CheckoutPhoneVerifyModal'
import {RecapPiecesWall} from './RecapPiecesWall'
import styles from './subscriptionRecap.module.css'

const BENEFITS = [
  '400 € de pièces à louer (sans limites de temps)',
  'Livraison à domicile partout en France',
  'Pressing inclus',
  'Assurance incluse',
  '1 échange inclus par mois',
  '20 % de réduction sur l’achat des pièces',
] as const

type Props = {
  wallItems: RecapWallItem[]
  /** Intégré dans le shell compte (`/profil/abonnement`) : panneau seul, sans mur. */
  embedded?: boolean
  /** URL `next` après signup / session (défaut : `/abonnement/recap`). */
  authNextPath?: string
}

export function SubscriptionRecapClient({
  wallItems,
  embedded = false,
  authNextPath = WEBSITE_SUBSCRIPTION_RECAP_PATH,
}: Props) {
  const router = useRouter()
  const resumeHandledRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [activatedNote, setActivatedNote] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)
  const [onboardingEmail, setOnboardingEmail] = useState<string | null>(null)
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<CheckoutOnboardingStep>(1)
  const [phoneVerifyE164, setPhoneVerifyE164] = useState<string | null>(null)

  useEffect(() => {
    if (resumeHandledRef.current) return
    resumeHandledRef.current = true

    void (async () => {
      try {
        try {
          if (sessionStorage.getItem('segna_password_recovery') === '1') {
            sessionStorage.removeItem('segna_password_recovery')
            router.replace('/reset-password')
            return
          }
        } catch {
          // ignore
        }

        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash
        if (new URLSearchParams(hash).get('type') === 'recovery') {
          router.replace('/reset-password')
          return
        }

        const supabase = createSupabaseBrowserClient()
        const resume = await resolveCheckoutOnboardingResume(supabase)
        if (resume.status === 'resume') {
          setOnboardingInitialStep(resume.step)
          setOnboardingEmail(resume.email)
        }
      } catch {
        // rester sur le récap
      }
    })()
  }, [router])

  const startStripeCheckout = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const {data} = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    if (!accessToken) {
      router.replace(`/signup?next=${encodeURIComponent(authNextPath)}`)
      return
    }

    trackWebsiteEvent('subscription_checkout_started', {
      plan_code: 'segna_x',
    })
    trackWebsiteEvent('subscription_interest', {
      placement: embedded ? 'profil_abonnement_recap_activate' : 'abonnement_recap_activate',
      plan_code: 'segna_x',
    })

    const response = await fetch('/api/subscription/checkout', {
      method: 'POST',
      credentials: 'omit',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    const payload = (await response.json().catch(() => null)) as {
      url?: string
      message?: string
      code?: string
    } | null

    if (response.status === 401) {
      setActivateError('Session expirée. Reconnecte-toi pour activer SegnaX.')
      return
    }

    if (!response.ok || !payload?.url) {
      throw new Error(payload?.message ?? 'Impossible de lancer le checkout Stripe.')
    }

    window.location.assign(payload.url)
  }, [authNextPath, embedded, router])

  const handleActivate = useCallback(async () => {
    if (pending) return
    setPending(true)
    setActivatedNote(false)
    setActivateError(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const resume = await resolveCheckoutOnboardingResume(supabase)
      if (resume.status === 'need_auth') {
        router.replace(`/signup?next=${encodeURIComponent(authNextPath)}`)
        return
      }
      if (resume.status === 'resume') {
        setOnboardingInitialStep(resume.step)
        setOnboardingEmail(resume.email)
        return
      }
      if (resume.status === 'need_phone_verify') {
        setPhoneVerifyE164(resume.phoneE164)
        return
      }

      await startStripeCheckout()
    } catch (error) {
      setActivateError(error instanceof Error ? error.message : 'Impossible de lancer le checkout Stripe.')
      setActivatedNote(true)
    } finally {
      setPending(false)
    }
  }, [authNextPath, pending, router, startStripeCheckout])

  const handlePhoneVerified = useCallback(async () => {
    setPhoneVerifyE164(null)
    setPending(true)
    setActivateError(null)
    try {
      await startStripeCheckout()
    } catch (error) {
      setActivateError(error instanceof Error ? error.message : 'Impossible de lancer le checkout Stripe.')
      setActivatedNote(true)
    } finally {
      setPending(false)
    }
  }, [startStripeCheckout])

  const handleSecondaryCta = useCallback(async () => {
    if (pending) return
    if (embedded) {
      router.push('/profil')
      return
    }
    const href = segnaAppDownloadHref()
    trackWebsiteEvent('cta_clicked', {
      cta_label: 'Continuer sans abonnement',
      cta_href: href,
      placement: 'abonnement_recap_secondary',
    })
    trackWebsiteEvent('app_open_intent', {
      destination: 'app_store',
      href,
      placement: 'abonnement_recap_secondary',
    })
    window.location.assign(href)
  }, [embedded, pending, router])

  const statusBlock =
    activateError || activatedNote ? (
      <p className={styles.status} role="status">
        {activateError ??
          'Impossible de lancer le checkout SegnaX. Réessaie dans un instant, ou connecte-toi à nouveau.'}
      </p>
    ) : null

  const primaryCtaContent = pending ? <WaveDotsLoader /> : 'Essaye SegnaX'
  const secondaryLabel = embedded ? 'Retour au compte' : 'Continuer sans abonnement'

  return (
    <div className={[styles.page, embedded ? styles.pageEmbedded : ''].filter(Boolean).join(' ')}>
      <div className={styles.shell}>
        <main className={styles.main}>
          <div className={styles.panel}>
            <h1 className={styles.title}>Des centaines de pièces à porter à volonté&nbsp;!</h1>
            <p className={styles.lead}>
              Porte ce que tu veux, quand tu veux, où tu veux et sans contraintes, pour 40&nbsp;€/mois.
            </p>

            <p className={styles.benefitsIntro}>
              <span>Avec</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/segnaX_logo_mark.png"
                alt="SegnaX"
                className={styles.segnaXLogo}
                width={96}
                height={28}
                decoding="async"
              />
              <span>, vous profitez de&nbsp;:</span>
            </p>
            <ul className={styles.benefits}>
              {BENEFITS.map((benefit) => (
                <li key={benefit} className={styles.benefit}>
                  <span className={styles.check} aria-hidden>
                    ✓
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <button type="button" className={styles.cta} disabled={pending} onClick={() => void handleActivate()}>
              {primaryCtaContent}
            </button>

            <button
              type="button"
              className={styles.secondaryCta}
              disabled={pending}
              onClick={() => void handleSecondaryCta()}
            >
              {secondaryLabel}
            </button>

            {statusBlock}
          </div>
        </main>

        {!embedded && wallItems.length > 0 ? (
          <aside className={styles.wallSlot}>
            <RecapPiecesWall items={wallItems} fade="none" />
          </aside>
        ) : null}
      </div>

      <CheckoutSignupOnboardingModal
        open={Boolean(onboardingEmail)}
        email={onboardingEmail ?? ''}
        intent="signup"
        initialStep={onboardingInitialStep}
        onClose={() => {
          setOnboardingEmail(null)
          setOnboardingInitialStep(1)
        }}
        onComplete={() => {
          setOnboardingEmail(null)
          setOnboardingInitialStep(1)
          void handleActivate()
        }}
      />

      <CheckoutPhoneVerifyModal
        open={Boolean(phoneVerifyE164)}
        initialPhoneE164={phoneVerifyE164 ?? ''}
        onClose={() => setPhoneVerifyE164(null)}
        onVerified={() => void handlePhoneVerified()}
      />
    </div>
  )
}

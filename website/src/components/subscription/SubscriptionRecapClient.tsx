'use client'

import {CheckoutSignupOnboardingModal} from '@/components/auth/CheckoutSignupOnboardingModal'
import type {CheckoutOnboardingStep} from '@/lib/auth/checkout-onboarding-resume'
import {resolveCheckoutOnboardingResume} from '@/lib/auth/checkout-onboarding-resume'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {WEBSITE_SUBSCRIPTION_RECAP_PATH} from '@/lib/cart/paths'
import {openIosAppOrAppStore, SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {detectClientPlatform, type ClientPlatform} from '@/lib/platform/client-platform'
import {SEGNAX_COMPARE_ROWS} from '@/lib/subscription/segnax-compare'
import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'
import {WaveDotsLoader} from '@/components/ui/WaveDotsLoader'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useRef, useState} from 'react'
import {CheckoutPhoneVerifyModal} from './CheckoutPhoneVerifyModal'
import {RecapPiecesWall} from './RecapPiecesWall'
import styles from './subscriptionRecap.module.css'

const BENEFITS = [
  '400 € de pièces à louer',
  'Livraison à domicile partout en France',
  'Pressing inclus',
  'Assurance incluse',
  '1 échange inclus par mois',
  '20 % de réduction sur l’achat des pièces',
] as const

type Props = {
  wallItems: RecapWallItem[]
}

export function SubscriptionRecapClient({wallItems}: Props) {
  const router = useRouter()
  const resumeHandledRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [activatedNote, setActivatedNote] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)
  const [onboardingEmail, setOnboardingEmail] = useState<string | null>(null)
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<CheckoutOnboardingStep>(1)
  const [phoneVerifyE164, setPhoneVerifyE164] = useState<string | null>(null)
  const [platform, setPlatform] = useState<ClientPlatform>('desktop')

  useEffect(() => {
    setPlatform(detectClientPlatform())
  }, [])

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

  const buildAppHandoffUrl = useCallback(async (type: string): Promise<string> => {
    const supabase = createSupabaseBrowserClient()
    const {data} = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    const refreshToken = data.session?.refresh_token
    if (accessToken && refreshToken) {
      const target = new URL('/auth/handoff', SEGNA_APP_BASE_URL)
      target.hash = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        type,
      }).toString()
      return target.toString()
    }
    return `${SEGNA_APP_BASE_URL}/auth/login?from=member`
  }, [])

  const startStripeCheckout = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const {data} = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    if (!accessToken) {
      router.replace(`/signup?next=${encodeURIComponent(WEBSITE_SUBSCRIPTION_RECAP_PATH)}`)
      return
    }

    trackWebsiteEvent('subscription_checkout_started', {
      plan_code: 'segna_x',
    })
    trackWebsiteEvent('subscription_interest', {
      placement: 'abonnement_recap_activate',
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
      setActivateError('Session expirée. Reconnecte-toi pour activer ton mois offert.')
      return
    }

    if (!response.ok || !payload?.url) {
      throw new Error(payload?.message ?? 'Impossible de lancer le checkout Stripe.')
    }

    window.location.assign(payload.url)
  }, [router])

  const handleActivate = useCallback(async () => {
    if (pending) return
    setPending(true)
    setActivatedNote(false)
    setActivateError(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const resume = await resolveCheckoutOnboardingResume(supabase)
      if (resume.status === 'need_auth') {
        router.replace(`/signup?next=${encodeURIComponent(WEBSITE_SUBSCRIPTION_RECAP_PATH)}`)
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
  }, [pending, router, startStripeCheckout])

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
    setPending(true)
    try {
      const appUrl = await buildAppHandoffUrl('website_skip_subscription')
      trackWebsiteEvent('app_open_intent', {
        destination: platform === 'ios' ? 'app_store' : 'app_handoff',
        href: appUrl,
        placement: 'abonnement_recap_secondary',
      })
      if (platform === 'ios') {
        openIosAppOrAppStore(appUrl)
        return
      }
      window.location.assign(appUrl)
    } catch {
      if (platform === 'ios') {
        openIosAppOrAppStore(`${SEGNA_APP_BASE_URL}/auth/login?from=member`)
        return
      }
      window.location.assign(`${SEGNA_APP_BASE_URL}/auth/login?from=member`)
    } finally {
      setPending(false)
    }
  }, [buildAppHandoffUrl, pending, platform])

  const statusBlock =
    activateError || activatedNote ? (
      <p className={styles.status} role="status">
        {activateError ??
          'Impossible de lancer le checkout SegnaX. Réessaie dans un instant, ou connecte-toi à nouveau.'}
      </p>
    ) : null

  const primaryCtaContent = pending ? <WaveDotsLoader /> : 'Activer — 20 € le 1er mois'

  return (
    <div className={styles.page}>
      {/* —— Mobile : UI/UX alignée page package app —— */}
      <div className={styles.mobilePackage}>
        <header className={styles.mobileHeader}>
          <h1 className={styles.mobileTitle}>Deviens membre SegnaX</h1>
          <p className={styles.mobileLead}>
            Votre offre −50&nbsp;% est prête — commencez à louer dès aujourd’hui.
          </p>
        </header>

        <div className={styles.mobileBody}>
          <section className={styles.offerRail} aria-label="Offre SegnaX">
            <div className={styles.offerRailTrack}>
              <article className={styles.offerCard} aria-pressed="true">
                <div className={styles.offerCardBadge}>−50&nbsp;% le 1er mois</div>
                <div className={styles.offerCardBody}>
                  <p className={styles.offerCardEyebrow}>SegnaX</p>
                  <p className={styles.offerCardPrice}>20&nbsp;€</p>
                  <p className={styles.offerCardDetail}>
                    <strong>le 1er mois</strong>, puis 40&nbsp;€/mois · sans engagement
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section className={styles.compare} aria-labelledby="recap-compare-heading">
            <h2 id="recap-compare-heading" className={styles.srOnly}>
              Comparaison Guest et SegnaX
            </h2>
            <div className={styles.compareTable} role="table" aria-label="Comparaison Guest et SegnaX">
              <div className={styles.compareRow} role="row">
                <div className={styles.compareCorner} role="columnheader">
                  <span className={styles.srOnly}>Critère</span>
                </div>
                <div className={styles.compareGuestHead} role="columnheader">
                  Guest
                </div>
                <div className={styles.compareMemberHead} role="columnheader">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/segnaX_logo_blanc.png"
                    alt="SegnaX"
                    className={styles.compareMemberLogo}
                    width={120}
                    height={39}
                  />
                </div>
              </div>
              {SEGNAX_COMPARE_ROWS.map((row, index) => {
                const isLast = index === SEGNAX_COMPARE_ROWS.length - 1
                return (
                  <div key={row.label} className={styles.compareRow} role="row">
                    <div
                      className={`${styles.compareLabel}${isLast ? ` ${styles.compareCellLast}` : ''}`}
                      role="rowheader"
                    >
                      {row.label}
                    </div>
                    <div
                      className={`${styles.compareGuest}${isLast ? ` ${styles.compareCellLast}` : ''}`}
                      role="cell"
                    >
                      {row.guest}
                    </div>
                    <div
                      className={`${styles.compareMember}${isLast ? ` ${styles.compareMemberLast}` : ''}`}
                      role="cell"
                    >
                      {row.member}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {statusBlock}
        </div>

        <footer className={styles.mobileFooter}>
          <button
            type="button"
            className={styles.mobileCta}
            disabled={pending}
            onClick={() => void handleActivate()}
          >
            {primaryCtaContent}
          </button>
          <button
            type="button"
            className={styles.mobileCancel}
            disabled={pending}
            onClick={() => void handleSecondaryCta()}
          >
            Continuer sans abonnement
          </button>
        </footer>
      </div>

      {/* —— Desktop : layout existant (panneau + mur) —— */}
      <div className={styles.shell}>
        <main className={styles.main}>
          <div className={styles.panel}>
            <h1 className={styles.title}>Votre offre −50 % est prête</h1>
            <p className={styles.lead}>
              Vous allez pouvoir commencer à louer vos prochaines pièces avec Segna dès aujourd’hui.
            </p>

            <div className={styles.priceGrid}>
              <div>
                <p className={styles.priceLabel}>Aujourd’hui</p>
                <p className={styles.priceValue}>20&nbsp;€</p>
              </div>
              <div>
                <p className={styles.priceLabel}>Ensuite</p>
                <p className={styles.priceValue}>40&nbsp;€/mois</p>
              </div>
              <p className={styles.priceCommitment}>Sans engagement · −50 % le 1er mois</p>
            </div>

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
              Continuer sans abonnement
            </button>

            {statusBlock}
          </div>
        </main>

        {wallItems.length > 0 ? (
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

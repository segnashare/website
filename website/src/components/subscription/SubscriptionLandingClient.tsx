'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {CheckoutAuthModal} from '@/components/auth/CheckoutAuthModal'
import {CheckoutSignupOnboardingModal} from '@/components/auth/CheckoutSignupOnboardingModal'
import type {CheckoutOnboardingStep} from '@/lib/auth/checkout-onboarding-resume'
import {resolveCheckoutOnboardingResume} from '@/lib/auth/checkout-onboarding-resume'
import {WEBSITE_SUBSCRIPTION_PATH, WEBSITE_SUBSCRIPTION_RECAP_PATH} from '@/lib/cart/paths'
import {SEGNAX_COMPARE_ROWS} from '@/lib/subscription/segnax-compare'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useRouter} from 'next/navigation'
import styles from './subscriptionLanding.module.css'

export function SubscriptionLandingClient() {
  const router = useRouter()
  const [authOpen, setAuthOpen] = useState(false)
  const [onboardingEmail, setOnboardingEmail] = useState<string | null>(null)
  const [onboardingIntent, setOnboardingIntent] = useState<'signup' | 'signin'>('signup')
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<CheckoutOnboardingStep>(1)
  const [pending, setPending] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const checkoutHandledRef = useRef(false)

  const authReturnPath = `${WEBSITE_SUBSCRIPTION_PATH}?checkout=1`

  const beginReady = useCallback(() => {
    setAuthOpen(false)
    setOnboardingEmail(null)
    setPending(false)
    router.replace(WEBSITE_SUBSCRIPTION_RECAP_PATH)
  }, [router])

  const openOnboardingResume = useCallback((email: string, step: CheckoutOnboardingStep) => {
    setAuthOpen(false)
    setOnboardingIntent('signup')
    setOnboardingInitialStep(step)
    setOnboardingEmail(email)
  }, [])

  const handleCta = useCallback(async () => {
    if (pending) return
    setPending(true)
    setAuthError(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const resume = await resolveCheckoutOnboardingResume(supabase)
      if (resume.status === 'ready') {
        beginReady()
        return
      }
      if (resume.status === 'resume') {
        openOnboardingResume(resume.email, resume.step)
        return
      }
      setAuthOpen(true)
    } catch {
      setAuthOpen(true)
    } finally {
      setPending(false)
    }
  }, [beginReady, openOnboardingResume, pending])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const wantsCheckout = params.get('checkout') === '1'
    const oauthError = params.get('auth_error')
    if (!wantsCheckout && !oauthError) return
    if (checkoutHandledRef.current) return
    checkoutHandledRef.current = true

    if (oauthError) {
      setAuthError(oauthError)
      setAuthOpen(true)
    }

    const cleanUrl = () => {
      params.delete('checkout')
      params.delete('auth_error')
      const next = params.toString()
      const path = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`
      window.history.replaceState(null, '', path)
    }

    void (async () => {
      try {
        if (wantsCheckout && !oauthError) {
          const supabase = createSupabaseBrowserClient()
          const resume = await resolveCheckoutOnboardingResume(supabase)
          if (resume.status === 'ready') beginReady()
          else if (resume.status === 'resume') openOnboardingResume(resume.email, resume.step)
          else setAuthOpen(true)
        }
      } catch {
        if (wantsCheckout) setAuthOpen(true)
      } finally {
        cleanUrl()
      }
    })()
  }, [beginReady, openOnboardingResume])

  return (
    <div className={styles.main}>
      <section className={styles.hero} id="offre-segnax" aria-labelledby="offre-segnax-heading">
        <h2 id="offre-segnax-heading" className={styles.offerSectionTitle}>
          L&apos;offre SegnaX
        </h2>
        <p className={styles.lead}>
          Active ton abonnement en ligne, compose ta box, puis suis locations et échanges dans l&apos;app.
        </p>

        <div className={styles.offerCard}>
          <p className={styles.offerBadge}>Offre claire</p>
          <p className={styles.offerPrice}>
            <span className={styles.offerAmount}>39,99&nbsp;€</span>
            <span className={styles.offerPeriod}>/mois</span>
          </p>
          <p className={styles.offerTrial}>1er mois gratuit</p>
          <ul className={styles.offerList}>
            <li>Jusqu&apos;à 400&nbsp;€ de pièces en location</li>
            <li>Durée illimitée + 1 échange inclus / mois</li>
            <li>Assurance &amp; pressing inclus</li>
            <li>−30&nbsp;% sur l&apos;achat des pièces</li>
          </ul>
          <button type="button" className={styles.primaryCta} disabled={pending} onClick={() => void handleCta()}>
            {pending ? 'Chargement…' : 'Commencer — 1er mois gratuit'}
          </button>
          <p className={styles.offerFine}>
            Puis 39,99&nbsp;€/mois. Résiliable depuis l&apos;app. Le suivi des locations se fait sur Segna.
          </p>
        </div>
      </section>

      <section className={styles.compare} aria-labelledby="abonnement-compare">
        <h2 id="abonnement-compare" className={styles.compareTitle}>
          Guest vs SegnaX
        </h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col"> </th>
                <th scope="col">Guest</th>
                <th scope="col">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/segnaX_logo_blanc.png"
                    alt="SegnaX"
                    className={styles.memberLogo}
                    width={96}
                    height={31}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {SEGNAX_COMPARE_ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.guest}</td>
                  <td className={styles.memberCell}>{row.member}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.after}>
        <h2 className={styles.compareTitle}>Après l&apos;activation</h2>
        <ol className={styles.steps}>
          <li>
            <strong>Compte &amp; abonnement</strong> — tu t&apos;inscris et tu actives SegnaX depuis ce site.
          </li>
          <li>
            <strong>Première box</strong> — tu peux la composer ici, c&apos;est plus fluide dans l&apos;app.
          </li>
          <li>
            <strong>Suivi</strong> — locations, échanges, retours et notifications se gèrent dans l&apos;app Segna.
          </li>
        </ol>
        <button type="button" className={styles.primaryCta} disabled={pending} onClick={() => void handleCta()}>
          {pending ? 'Chargement…' : 'Activer mon essai gratuit'}
        </button>
      </section>

      <CheckoutAuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={beginReady}
        onStartEmailOnboarding={(email, intent = 'signup') => {
          setAuthOpen(false)
          setOnboardingIntent(intent)
          setOnboardingInitialStep(1)
          setOnboardingEmail(email)
        }}
        returnPath={authReturnPath}
        initialAuthError={authError}
      />
      <CheckoutSignupOnboardingModal
        open={Boolean(onboardingEmail)}
        email={onboardingEmail ?? ''}
        intent={onboardingIntent}
        initialStep={onboardingInitialStep}
        onClose={() => {
          setOnboardingEmail(null)
          setOnboardingInitialStep(1)
        }}
        onComplete={() => {
          setOnboardingEmail(null)
          setOnboardingInitialStep(1)
          beginReady()
        }}
      />
    </div>
  )
}

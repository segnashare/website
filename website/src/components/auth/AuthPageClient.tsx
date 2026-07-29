'use client'

import {CheckoutAuthPanel, type CheckoutAuthMode} from '@/components/auth/CheckoutAuthPanel'
import {CheckoutSignupOnboardingModal} from '@/components/auth/CheckoutSignupOnboardingModal'
import type {CheckoutOnboardingStep} from '@/lib/auth/checkout-onboarding-resume'
import {resolveCheckoutOnboardingResume} from '@/lib/auth/checkout-onboarding-resume'
import {hasActivePaidSubscription} from '@/lib/auth/has-active-subscription'
import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {WEBSITE_SUBSCRIPTION_RECAP_PATH} from '@/lib/cart/paths'
import {RECAP_WALL_ITEMS} from '@/lib/subscription/recap-wall-items'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {RecapPiecesWall} from '@/components/subscription/RecapPiecesWall'
import Link from 'next/link'
import {useRouter, useSearchParams} from 'next/navigation'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import styles from './signupPage.module.css'

const LEGAL = [
  {label: "Conditions Générales d'Utilisation", href: '/conditions-generales-utilisation'},
  {label: 'Politique de confidentialité', href: '/politique-confidentialite'},
  {label: 'Politique de cookies', href: '/politique-de-cookies'},
] as const

type Props = {
  mode: CheckoutAuthMode
}

export function AuthPageClient({mode}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = useMemo(() => {
    const raw = searchParams.get('next')?.trim()
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
      if (raw === '/abonnement' || raw.startsWith('/abonnement?')) {
        return WEBSITE_SUBSCRIPTION_RECAP_PATH
      }
      if (raw.startsWith('/abonnement/') && !raw.startsWith('/abonnement/recap') && !raw.startsWith('/abonnement/succes')) {
        return WEBSITE_SUBSCRIPTION_RECAP_PATH
      }
      return raw
    }
    return WEBSITE_SUBSCRIPTION_RECAP_PATH
  }, [searchParams])

  const nextQuery = useMemo(() => {
    if (mode === 'signin') return ''
    const q = new URLSearchParams()
    q.set('next', nextPath)
    return `?${q.toString()}`
  }, [mode, nextPath])

  const returnPath = useMemo(() => {
    // Signin : revenir sur /signin pour reprendre l’onboarding website si incomplet.
    if (mode === 'signin') return '/signin?resume=1'
    const url = new URL(nextPath, 'https://segna.local')
    url.searchParams.set('checkout', '1')
    return `${url.pathname}${url.search}`
  }, [mode, nextPath])

  const switchHref = mode === 'signup' ? `/signin${nextQuery}` : `/signup${nextQuery}`
  /** Toujours website : la redirection app ne se fait qu’après onboarding website complet (`goNext`). */
  const authDestination = 'website' as const

  const prefillEmail = useMemo(() => {
    const raw = searchParams.get('email')?.trim().toLowerCase() ?? ''
    return raw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : ''
  }, [searchParams])

  const accountExistsNotice =
    searchParams.get('notice') === 'account_exists'
      ? 'Un compte existe déjà avec cette adresse. Connecte-toi.'
      : searchParams.get('notice') === 'password_updated'
        ? 'Mot de passe mis à jour. Connecte-toi.'
        : null

  const [onboardingEmail, setOnboardingEmail] = useState<string | null>(null)
  const [onboardingIntent, setOnboardingIntent] = useState<'signup' | 'signin'>(mode)
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<CheckoutOnboardingStep>(1)
  const [forceEmailOtp, setForceEmailOtp] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const resumeHandledRef = useRef(false)

  const goToSignInWithExistingAccount = useCallback(
    (email: string) => {
      const q = new URLSearchParams()
      q.set('email', email.trim().toLowerCase())
      q.set('notice', 'account_exists')
      if (nextPath.startsWith('/') && !nextPath.startsWith('//')) {
        q.set('next', nextPath)
      }
      router.replace(`/signin?${q.toString()}`)
    },
    [nextPath, router],
  )

  const openOnboardingResume = useCallback((email: string, step: CheckoutOnboardingStep) => {
    setOnboardingIntent(mode)
    setOnboardingInitialStep(step)
    setForceEmailOtp(false)
    setOnboardingEmail(email)
  }, [mode])

  const redirectToApp = useCallback(async () => {
    try {
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
          type: 'website_signin',
        }).toString()
        window.location.assign(target.toString())
        return
      }
    } catch {
      // fallback below
    }
    window.location.assign(`${SEGNA_APP_BASE_URL}/auth/login?from=member`)
  }, [])

  const goNext = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      const resume = await resolveCheckoutOnboardingResume(supabase)

      // Tunnel website incomplet → reprendre la modale (nom / adresse / …).
      if (resume.status === 'resume') {
        openOnboardingResume(resume.email, resume.step)
        return
      }

      if (resume.status === 'need_auth') {
        return
      }

      // Déjà abonné → app ; sinon toujours récap activation SegnaX
      // (OTP téléphone géré sur le récap avant Stripe).
      const alreadySubscribed = await hasActivePaidSubscription(supabase)
      if (alreadySubscribed) {
        await redirectToApp()
        return
      }

      router.replace(WEBSITE_SUBSCRIPTION_RECAP_PATH)
    } catch {
      router.replace(WEBSITE_SUBSCRIPTION_RECAP_PATH)
    }
  }, [openOnboardingResume, redirectToApp, router])

  // Déjà connecté sur /signup (ou /signin) → ne pas rester sur le formulaire.
  useEffect(() => {
    if (resumeHandledRef.current) return
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: {user},
        } = await supabase.auth.getUser()
        if (!user) return
        resumeHandledRef.current = true
        await goNext()
      } catch {
        // rester sur le formulaire
      }
    })()
  }, [goNext])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('auth_error')
    const wantsResume = params.get('checkout') === '1' || params.get('resume') === '1'
    if (!oauthError && !wantsResume) return
    if (resumeHandledRef.current) return
    resumeHandledRef.current = true

    if (oauthError) setAuthError(oauthError)

    const cleanUrl = () => {
      params.delete('auth_error')
      params.delete('checkout')
      params.delete('resume')
      const next = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${next ? `?${next}` : ''}`)
    }

    void (async () => {
      try {
        if (wantsResume && !oauthError) {
          const supabase = createSupabaseBrowserClient()
          const resume = await resolveCheckoutOnboardingResume(supabase)
          if (resume.status === 'ready') {
            void goNext()
            return
          }
          if (resume.status === 'resume') {
            openOnboardingResume(resume.email, resume.step)
          }
        }
      } finally {
        cleanUrl()
      }
    })()
  }, [goNext, openOnboardingResume])

  const intro =
    mode === 'signup'
      ? "Crée ton compte pour activer ton mois d'abonnement Segna offert et commencer à louer tes prochaines pièces."
      : 'Connecte-toi pour gérer ton abonnement et continuer tes locations.'

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section
          className={styles.formCol}
          aria-label={mode === 'signup' ? 'Création de compte' : 'Connexion'}
        >
          <div className={styles.formInner}>
            <Link href="/" className={styles.brand} aria-label="Accueil Segna">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/segna-logo.svg" alt="Segna" className={styles.brandLogo} width={120} height={36} />
            </Link>

            <p className={styles.intro}>{intro}</p>

            <div className={styles.card}>
              <CheckoutAuthPanel
                key={`${mode}:${prefillEmail}:${accountExistsNotice ?? ''}`}
                variant="page"
                initialMode={mode}
                switchHref={switchHref}
                returnPath={returnPath}
                destination={authDestination}
                initialAuthError={authError}
                initialEmail={prefillEmail}
                initialStatus={accountExistsNotice}
                onAccountExists={goToSignInWithExistingAccount}
                onAuthenticated={() => void goNext()}
                onStartEmailOnboarding={(email, intent = mode, step = 1) => {
                  setOnboardingIntent(intent)
                  setOnboardingInitialStep(step)
                  // Ne pas forcer signInWithOtp (Magic Link). L’OTP signup = Confirm signup.
                  setForceEmailOtp(intent === 'signin')
                  setOnboardingEmail(email)
                }}
              />
            </div>

            <nav className={styles.legalNav} aria-label="Mentions légales">
              {LEGAL.map((item) => (
                <Link key={item.href} href={item.href} className={styles.legalLink}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <aside className={styles.visualCol} aria-hidden>
          <RecapPiecesWall items={RECAP_WALL_ITEMS} fade="none" layout="columns" />
        </aside>
        <aside className={styles.visualColMobile} aria-hidden>
          <RecapPiecesWall items={RECAP_WALL_ITEMS} fade="none" layout="rows" />
        </aside>
      </div>

      <CheckoutSignupOnboardingModal
        open={Boolean(onboardingEmail)}
        email={onboardingEmail ?? ''}
        intent={onboardingIntent}
        initialStep={onboardingInitialStep}
        forceEmailOtp={forceEmailOtp}
        onClose={() => {
          setOnboardingEmail(null)
          setOnboardingInitialStep(1)
          setForceEmailOtp(false)
        }}
        onComplete={() => {
          setOnboardingEmail(null)
          setOnboardingInitialStep(1)
          setForceEmailOtp(false)
          void goNext()
        }}
      />
    </div>
  )
}

'use client'

import {bootstrapUserAfterSignup} from '@/lib/auth/bootstrap-user'
import type {CheckoutOnboardingStep} from '@/lib/auth/checkout-onboarding-resume'
import {mapAuthErrorMessage} from '@/lib/auth/map-auth-error'
import {getSignUpPasswordError, isSignUpPasswordValid} from '@/lib/auth/password'
import {storeWebsiteAuthNext} from '@/lib/auth/website-auth-next'
import {trackWebsiteEvent, trackWebsiteSignupOnce} from '@/lib/analytics/track'
import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {WaveDotsLoader} from '@/components/ui/WaveDotsLoader'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {useCallback, useEffect, useId, useState, type FormEvent, type ReactNode} from 'react'
import styles from './checkoutAuthModal.module.css'

const PRIVACY_HREF = 'https://www.segnashare.com/politique-confidentialite'
const TERMS_HREF = 'https://help.segnashare.com'

function PasswordEyeIcon({open}: {open: boolean}) {
  if (open) {
    // Œil barré = masquer
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M10.5 10.7a2.2 2.2 0 0 0 3 3M9.4 5.5A10.5 10.5 0 0 1 12 5.2c5.2 0 8.8 4.2 10 6.8-.5 1.1-1.5 2.8-3.1 4.2M6.2 6.3C4.2 7.7 2.9 9.5 2 12c1.2 2.6 4.8 6.8 10 6.8 1.3 0 2.5-.2 3.6-.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  // Œil ouvert = afficher
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export type CheckoutAuthMode = 'signup' | 'signin'

type Props = {
  /** Chemin de retour OAuth, ex. `/abonnement?checkout=1`. */
  returnPath: string
  initialAuthError?: string | null
  /** Après auth réussie (reste sur le website). */
  onAuthenticated: () => void
  /** Après envoi OTP e-mail → modale code (ou reprise onboarding si `step` ≥ 2). */
  onStartEmailOnboarding: (
    email: string,
    intent?: 'signup' | 'signin',
    step?: CheckoutOnboardingStep,
  ) => void
  /** `page` : pas de bouton Annuler, CTA pleine largeur, e-mail d’abord. */
  variant?: 'modal' | 'page'
  onCancel?: () => void
  /** Remplace le titre (sinon selon mode). */
  titleOverride?: string
  headerSlot?: ReactNode
  className?: string
  initialMode?: CheckoutAuthMode
  /**
   * En `variant="page"` : lien vers l’autre page auth (ex. `/signin?next=…`)
   * au lieu de basculer le mode dans la même page.
   */
  switchHref?: string | null
  /** Si le compte existe déjà en signup page → redirection (avec e-mail). */
  onAccountExists?: (email: string) => void
  /** Préremplit l’e-mail (ex. redirection depuis signup compte existant). */
  initialEmail?: string
  /** Message d’annonce (ex. compte déjà existant). */
  initialStatus?: string | null
  /**
   * `website` : reste sur le site (returnPath).
   * `app` : après auth, envoie vers l’app web (OAuth sans return_to / handoff session).
   */
  destination?: 'website' | 'app'
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={styles.oauthIcon}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function authErrorMessage(code: string | null | undefined): string | null {
  switch (code) {
    case 'provider_error':
      return 'Connexion annulée ou refusée.'
    case 'missing_code':
    case 'exchange_failed':
      return 'Connexion incomplète. Réessaie.'
    case 'missing_user':
      return 'Session introuvable après connexion.'
    case 'bootstrap_failed':
      return "Connexion réussie, mais l'initialisation du compte a échoué."
    case 'config_error':
      return 'Configuration auth indisponible pour le moment.'
    default:
      return null
  }
}

export function CheckoutAuthPanel({
  returnPath,
  initialAuthError = null,
  onAuthenticated,
  onStartEmailOnboarding,
  variant = 'modal',
  onCancel,
  titleOverride,
  headerSlot,
  className,
  initialMode = 'signup',
  switchHref = null,
  onAccountExists,
  initialEmail = '',
  initialStatus = null,
  destination = 'website',
}: Props) {
  const titleId = useId()
  const emailFieldId = useId()
  const passwordFieldId = useId()
  const isPage = variant === 'page'
  const [mode, setMode] = useState<CheckoutAuthMode>(initialMode)
  /** Page signup : e-mail puis création du mot de passe (comme HomeExchange). */
  const [signupStep, setSignupStep] = useState<'email' | 'password'>('email')
  const [email, setEmail] = useState(() => initialEmail.trim().toLowerCase())
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(() => initialStatus)

  useEffect(() => {
    setMode(initialMode)
    setSignupStep('email')
    setEmail(initialEmail.trim().toLowerCase())
    setPassword('')
    setPasswordVisible(false)
    setMarketingOptIn(false)
    setPending(false)
    setStatus(initialStatus)
    setError(authErrorMessage(initialAuthError))
  }, [initialAuthError, initialEmail, initialMode, initialStatus])

  const redirectToAppWithSession = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const {data} = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    const refreshToken = data.session?.refresh_token
    if (!accessToken || !refreshToken) {
      window.location.assign(`${SEGNA_APP_BASE_URL}/auth/login?from=member`)
      return
    }
    const target = new URL('/auth/handoff', SEGNA_APP_BASE_URL)
    target.hash = new URLSearchParams({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      type: 'website_signin',
    }).toString()
    window.location.assign(target.toString())
  }, [])

  const finishAuthenticated = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      const boot = await bootstrapUserAfterSignup(supabase)
      if (!boot.ok) {
        setError(mapAuthErrorMessage(boot.message, "Impossible d'initialiser ton compte."))
        return
      }
      if (mode === 'signup') {
        trackWebsiteSignupOnce({method: 'email'})
      }
    } catch {
      // Compte déjà bootstrappé / RPC indisponible : on continue.
    }
    if (destination === 'app') {
      trackWebsiteEvent('app_open_intent', {
        destination: 'app_handoff',
        placement: 'checkout_auth',
      })
      await redirectToAppWithSession()
      return
    }
    onAuthenticated()
  }, [destination, mode, onAuthenticated, redirectToAppWithSession])

  const handleGoogle = async () => {
    if (pending) return
    setError(null)
    setPending(true)
    try {
      trackWebsiteEvent('auth_sign_up_started', {method: 'oauth', provider: 'google'})
      const supabase = createSupabaseBrowserClient()

      if (destination === 'app') {
        // Connexion membre : reste sur l’app (pas de return_to website).
        const appCallback = new URL('/auth/callback', SEGNA_APP_BASE_URL)
        appCallback.searchParams.set('intent', 'member')
        const {error: oauthError} = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: appCallback.toString(),
            queryParams: {prompt: 'select_account'},
          },
        })
        if (oauthError) {
          setError(mapAuthErrorMessage(oauthError.message, 'Impossible de lancer Google.'))
          setPending(false)
        }
        return
      }

      // Website (panier / checkout / signup) : callback direct, URL courte (allowlist Supabase).
      // `next` est en sessionStorage + cookie (www / non-www) — pas dans redirectTo.
      storeWebsiteAuthNext(returnPath)
      const websiteCallback = new URL('/auth/callback', window.location.origin)
      const {error: oauthError} = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: websiteCallback.toString(),
          queryParams: {prompt: 'select_account'},
        },
      })
      if (oauthError) {
        setError(mapAuthErrorMessage(oauthError.message, 'Impossible de lancer Google.'))
        setPending(false)
      }
    } catch {
      setError('Impossible de lancer Google.')
      setPending(false)
    }
  }

  const handleSignupEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError(null)
    setStatus(null)

    const trimmed = email.trim().toLowerCase()
    if (!isValidEmail(trimmed)) {
      setError('Saisis une adresse e-mail valide.')
      return
    }

    setPending(true)
    try {
      try {
        const response = await fetch('/api/auth/user-exists', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email: trimmed, mode: 'auth'}),
        })
        if (response.ok) {
          const payload = (await response.json()) as {
            exists?: boolean
            emailConfirmed?: boolean
          }
          if (payload.exists && payload.emailConfirmed) {
            if (isPage && onAccountExists) {
              onAccountExists(trimmed)
              setPending(false)
              return
            }
            setError('Un compte existe déjà. Connecte-toi.')
            setMode('signin')
            setPending(false)
            return
          }
        }
      } catch {
        // Continuer l’inscription si le check est indisponible.
      }

      setEmail(trimmed)
      trackWebsiteEvent('auth_sign_up_started', {method: 'email'})

      // Page signup : étape mot de passe avant OTP / création.
      if (isPage) {
        setSignupStep('password')
        setPassword('')
        setPending(false)
        return
      }

      const supabase = createSupabaseBrowserClient()
      const {error: otpError} = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {shouldCreateUser: true},
      })
      if (otpError) {
        const msg = (otpError.message ?? '').toLowerCase()
        if (msg.includes('rate limit') || msg.includes('login.new_email')) {
          setError('Trop de tentatives. Attends un peu avant de réessayer.')
        } else {
          setError("Impossible d'envoyer l'e-mail pour le moment.")
        }
        setPending(false)
        return
      }

      setPending(false)
      onStartEmailOnboarding(trimmed, 'signup')
    } catch (err) {
      console.error('[checkout-auth] signup email step', err)
      setError(
        mapAuthErrorMessage(
          err instanceof Error ? err.message : null,
          'Une erreur est survenue. Réessaie.',
        ),
      )
      setPending(false)
    }
  }

  const handleSignupPassword = async (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError(null)
    setStatus(null)

    const trimmed = email.trim().toLowerCase()
    if (!isValidEmail(trimmed)) {
      setError('Saisis une adresse e-mail valide.')
      setSignupStep('email')
      return
    }
    // Même règle que segna-app `signUpPasswordSchema` (longueur brute, sans trim).
    const passwordError = getSignUpPasswordError(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const {data, error: signUpError} = await supabase.auth.signUp({
        email: trimmed,
        password,
      })
      if (signUpError) {
        const msg = (signUpError.message ?? '').toLowerCase()
        if (msg.includes('already') || msg.includes('registered')) {
          if (onAccountExists) {
            onAccountExists(trimmed)
          } else {
            setError('Un compte existe déjà. Connecte-toi.')
            setMode('signin')
          }
        } else if (msg.includes('password')) {
          setError(mapAuthErrorMessage(signUpError.message, 'Mot de passe invalide.'))
        } else {
          setError(mapAuthErrorMessage(signUpError.message, "Impossible de créer le compte."))
        }
        setPending(false)
        return
      }

      // Confirm e-mail ON → Supabase envoie déjà le code via signUp (template Confirm signup).
      // Confirm OFF (session immédiate) → renvoyer ce même mail de confirmation (pas Magic Link).
      if (data.session) {
        const {error: otpError} = await supabase.auth.resend({
          type: 'signup',
          email: trimmed,
        })
        if (otpError) {
          const msg = (otpError.message ?? '').toLowerCase()
          if (msg.includes('rate limit') || msg.includes('login.new_email')) {
            setError('Compte créé. Trop de tentatives pour le code — réessaie dans un instant.')
          } else {
            console.warn('[checkout-auth] signup resend after session', otpError.message)
          }
        }
      }

      setPending(false)
      onStartEmailOnboarding(trimmed, 'signup', 1)
    } catch (err) {
      console.error('[checkout-auth] signup password', err)
      setError(
        mapAuthErrorMessage(
          err instanceof Error ? err.message : null,
          'Une erreur est survenue. Réessaie.',
        ),
      )
      setPending(false)
    }
  }

  const handleSignInWithEmailOtp = async () => {
    if (pending) return
    setError(null)
    setStatus(null)

    const trimmed = email.trim().toLowerCase()
    if (!isValidEmail(trimmed)) {
      setError('Saisis une adresse e-mail valide.')
      return
    }

    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const {error: otpError} = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {shouldCreateUser: false},
      })
      if (otpError) {
        const msg = (otpError.message ?? '').toLowerCase()
        if (msg.includes('rate limit') || msg.includes('login.new_email') || msg.includes('after')) {
          setError('Trop de tentatives. Attends un peu avant de réessayer.')
        } else if (msg.includes('signups not allowed') || msg.includes('user not found')) {
          setError("Aucun compte avec cet e-mail. Crée un compte d'abord.")
          setMode('signup')
        } else {
          setError(
            mapAuthErrorMessage(otpError.message, "Impossible d'envoyer l'e-mail pour le moment."),
          )
        }
        setPending(false)
        return
      }
      setEmail(trimmed)
      setPending(false)
      onStartEmailOnboarding(trimmed, 'signin')
    } catch (err) {
      console.error('[checkout-auth] signin otp', err)
      setError(
        mapAuthErrorMessage(
          err instanceof Error ? err.message : null,
          'Une erreur est survenue. Réessaie.',
        ),
      )
      setPending(false)
    }
  }

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError(null)
    setStatus(null)

    const trimmed = email.trim().toLowerCase()
    if (!isValidEmail(trimmed)) {
      setError('Saisis une adresse e-mail valide.')
      return
    }
    if (!password) {
      setError('Saisis ton mot de passe.')
      return
    }

    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const {error: signInError} = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      })
      if (signInError) {
        setError(mapAuthErrorMessage(signInError.message, 'Connexion impossible.'))
        setPending(false)
        return
      }
      await finishAuthenticated()
    } catch (err) {
      console.error('[checkout-auth] signin password', err)
      setError(
        mapAuthErrorMessage(
          err instanceof Error ? err.message : null,
          'Une erreur est survenue. Réessaie.',
        ),
      )
      setPending(false)
    }
  }

  const onPasswordStep = isPage && mode === 'signup' && signupStep === 'password'
  const title =
    titleOverride ??
    (mode === 'signin' ? 'Se connecter' : onPasswordStep ? 'Crée ton mot de passe' : 'Crée ton compte')

  const switchLine = (
    <p className={styles.switchLine}>
      {mode === 'signup' ? (
        <>
          Tu as déjà un compte ?{' '}
          {isPage && switchHref ? (
            <Link href={switchHref} className={styles.switchBtn}>
              Se connecter
            </Link>
          ) : (
            <button
              type="button"
              className={styles.switchBtn}
              onClick={() => {
                setMode('signin')
                setSignupStep('email')
                setError(null)
                setStatus(null)
              }}
            >
              Se connecter
            </button>
          )}
        </>
      ) : (
        <>
          Pas encore de compte ?{' '}
          {isPage && switchHref ? (
            <Link href={switchHref} className={styles.switchBtn}>
              Créer un compte
            </Link>
          ) : (
            <button
              type="button"
              className={styles.switchBtn}
              onClick={() => {
                setMode('signup')
                setSignupStep('email')
                setError(null)
                setStatus(null)
              }}
            >
              Créer un compte
            </button>
          )}
        </>
      )}
    </p>
  )

  const oauthBlock = (
    <div className={styles.oauthStack}>
      <button type="button" className={styles.oauthBtn} disabled={pending} onClick={() => void handleGoogle()}>
        <GoogleIcon />
        <span>Continuer avec Google</span>
      </button>
    </div>
  )

  const signupEmailForm = (
    <form className={styles.form} onSubmit={(e) => void handleSignupEmail(e)} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={emailFieldId}>
          Adresse email*
        </label>
        <input
          id={emailFieldId}
          className={styles.input}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          required
        />
      </div>

      {!isPage ? (
        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            disabled={pending}
          />
          <span>Je souhaite recevoir les actualités et offres Segna par e-mail.</span>
        </label>
      ) : null}

      <p className={styles.legal}>
        En continuant, tu acceptes nos{' '}
        <a href={TERMS_HREF} target="_blank" rel="noreferrer">
          conditions d&apos;utilisation
        </a>{' '}
        et notre{' '}
        <a href={PRIVACY_HREF} target="_blank" rel="noreferrer">
          politique de confidentialité
        </a>
        .
      </p>

      {error ? <p className={styles.error}>{error}</p> : null}
      {status ? <p className={styles.status}>{status}</p> : null}

      <div className={isPage ? styles.footerPage : styles.footer}>
        {!isPage && onCancel ? (
          <button type="button" className={styles.cancelBtn} disabled={pending} onClick={onCancel}>
            Annuler
          </button>
        ) : null}
        <button type="submit" className={isPage ? styles.submitBtnPage : styles.submitBtn} disabled={pending}>
          {pending ? <WaveDotsLoader /> : isPage ? 'Continuer avec mon email' : 'Créer un compte'}
        </button>
      </div>
    </form>
  )

  const passwordOk = isSignUpPasswordValid(password)

  const signupPasswordForm = (
    <form className={styles.form} onSubmit={(e) => void handleSignupPassword(e)} noValidate>
      <div className={styles.emailReadonlyRow}>
        <p className={styles.emailReadonly}>{email}</p>
        <button
          type="button"
          className={styles.switchBtn}
          disabled={pending}
          onClick={() => {
            setSignupStep('email')
            setPassword('')
            setError(null)
            setStatus(null)
          }}
        >
          Modifier
        </button>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={passwordFieldId}>
          Mot de passe*
        </label>
        <div className={styles.passwordWrap}>
          <input
            id={passwordFieldId}
            className={styles.input}
            type={passwordVisible ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (error) setError(null)
            }}
            disabled={pending}
            required
            minLength={8}
            aria-invalid={Boolean(error)}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            aria-label={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={passwordVisible}
            onClick={() => setPasswordVisible((v) => !v)}
          >
            <PasswordEyeIcon open={passwordVisible} />
          </button>
        </div>
        <p className={styles.passwordHint}>8 caractères minimum</p>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.footerPage}>
        <button
          type="submit"
          className={styles.submitBtnPage}
          disabled={pending}
          data-ready={passwordOk ? 'true' : 'false'}
          aria-disabled={!passwordOk || pending}
        >
          {pending ? <WaveDotsLoader /> : 'Continuer'}
        </button>
      </div>
    </form>
  )

  const signupForm = onPasswordStep ? signupPasswordForm : signupEmailForm

  const signinForm = (
    <form className={styles.form} onSubmit={(e) => void handleSignIn(e)} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={emailFieldId}>
          Adresse email*
        </label>
        <input
          id={emailFieldId}
          className={styles.input}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          required
        />
      </div>
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label className={styles.label} htmlFor={passwordFieldId}>
            Mot de passe
          </label>
          <Link
            href={
              email.trim()
                ? `/forgot-password?email=${encodeURIComponent(email.trim().toLowerCase())}`
                : '/forgot-password'
            }
            className={styles.forgotLink}
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <div className={styles.passwordWrap}>
          <input
            id={passwordFieldId}
            className={styles.input}
            type={passwordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            required
          />
          <button
            type="button"
            className={styles.passwordToggle}
            aria-label={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={passwordVisible}
            disabled={pending}
            onClick={() => setPasswordVisible((v) => !v)}
          >
            <PasswordEyeIcon open={passwordVisible} />
          </button>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={isPage ? styles.footerPage : styles.footer}>
        {!isPage && onCancel ? (
          <button type="button" className={styles.cancelBtn} disabled={pending} onClick={onCancel}>
            Annuler
          </button>
        ) : null}
        <button type="submit" className={isPage ? styles.submitBtnPage : styles.submitBtn} disabled={pending}>
          {pending ? <WaveDotsLoader /> : 'Se connecter'}
        </button>
      </div>

      {!isPage ? (
        <button
          type="button"
          className={styles.switchBtn}
          style={{marginTop: 12, alignSelf: 'flex-start'}}
          disabled={pending}
          onClick={() => void handleSignInWithEmailOtp()}
        >
          Recevoir un code / lien par e-mail
        </button>
      ) : null}
    </form>
  )

  return (
    <div className={[styles.panel, isPage ? styles.panelPage : '', className].filter(Boolean).join(' ')}>
      {headerSlot}
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {switchLine}
      {isPage && mode === 'signin' && status ? (
        <p className={styles.status} role="status">
          {status}
        </p>
      ) : null}

      {isPage ? (
        <>
          {mode === 'signup' ? signupForm : signinForm}
          {!onPasswordStep ? (
            <>
              <div className={styles.divider} role="separator">
                ou
              </div>
              {oauthBlock}
            </>
          ) : null}
        </>
      ) : (
        <>
          {oauthBlock}
          <div className={styles.divider} role="separator">
            {mode === 'signup' ? 'ou enregistrer avec un e-mail' : 'ou se connecter avec un e-mail'}
          </div>
          {mode === 'signup' ? signupForm : signinForm}
        </>
      )}
    </div>
  )
}

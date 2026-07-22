'use client'

import {bootstrapUserAfterSignup} from '@/lib/auth/bootstrap-user'
import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useCallback, useEffect, useId, useState, type FormEvent} from 'react'
import {createPortal} from 'react-dom'
import styles from './checkoutAuthModal.module.css'

const PRIVACY_HREF = 'https://www.segnashare.com/politique-confidentialite'
const TERMS_HREF = 'https://help.segnashare.com'

type Mode = 'signup' | 'signin'

type Props = {
  open: boolean
  onClose: () => void
  /** Après auth réussie (reste sur le website) — connexion existante / Google. */
  onAuthenticated: () => void
  /** Après envoi OTP e-mail → modale code (signup = onboarding, signin = connexion seule). */
  onStartEmailOnboarding: (email: string, intent?: 'signup' | 'signin') => void
  /** Chemin de retour OAuth, ex. `/catalogue/piece/uuid?checkout=1`. */
  returnPath: string
  initialAuthError?: string | null
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

export function CheckoutAuthModal({
  open,
  onClose,
  onAuthenticated,
  onStartEmailOnboarding,
  returnPath,
  initialAuthError = null,
}: Props) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setMode('signup')
    setEmail('')
    setPassword('')
    setMarketingOptIn(false)
    setPending(false)
    setStatus(null)
    setError(authErrorMessage(initialAuthError))
  }, [open, initialAuthError])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, pending])

  const finishAuthenticated = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      const boot = await bootstrapUserAfterSignup(supabase)
      if (!boot.ok) {
        setError(boot.message)
        return
      }
    } catch {
      // Compte déjà bootstrappé / RPC indisponible : on continue le checkout.
    }
    onAuthenticated()
  }, [onAuthenticated])

  const handleGoogle = async () => {
    if (pending) return
    setError(null)
    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      /** Réutilise le callback OAuth déjà configuré sur l’app (pas de nouvel URL Google). */
      const websiteHandoff = new URL('/auth/callback', window.location.origin)
      websiteHandoff.searchParams.set('next', returnPath)

      const appCallback = new URL('/auth/callback', SEGNA_APP_BASE_URL)
      appCallback.searchParams.set('intent', 'signup')
      appCallback.searchParams.set('return_to', websiteHandoff.toString())

      const {error: oauthError} = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: appCallback.toString(),
          queryParams: {prompt: 'select_account'},
        },
      })
      if (oauthError) {
        setError(oauthError.message || 'Impossible de lancer Google.')
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
          // Auth (pas seulement public.users) : un compte OTP sans bootstrap doit quand même → signin.
          body: JSON.stringify({email: trimmed, mode: 'auth'}),
        })
        if (response.ok) {
          const payload = (await response.json()) as {
            exists?: boolean
            emailConfirmed?: boolean
          }
          // Compte confirmé → connexion. Sinon c’est juste un OTP commencé : on renvoie un code.
          if (payload.exists && payload.emailConfirmed) {
            setError('Un compte existe déjà. Reçois un code e-mail pour te connecter.')
            setMode('signin')
            setPending(false)
            return
          }
        }
      } catch {
        // Continuer l’inscription si le check est indisponible.
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

      setEmail(trimmed)
      setPending(false)
      onStartEmailOnboarding(trimmed, 'signup')
    } catch {
      setError('Une erreur est survenue. Réessaie.')
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
          setError(otpError.message || "Impossible d'envoyer l'e-mail pour le moment.")
        }
        setPending(false)
        return
      }
      setEmail(trimmed)
      setPending(false)
      onStartEmailOnboarding(trimmed, 'signin')
    } catch {
      setError('Une erreur est survenue. Réessaie.')
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
        const msg = (signInError.message ?? '').toLowerCase()
        if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
          setError('E-mail ou mot de passe incorrect.')
        } else {
          setError(signInError.message || 'Connexion impossible.')
        }
        setPending(false)
        return
      }
      await finishAuthenticated()
    } catch {
      setError('Une erreur est survenue. Réessaie.')
      setPending(false)
    }
  }

  if (!open || !mounted) return null

  const title = mode === 'signin' ? 'Se connecter' : 'Créer votre compte'

  const dialog = (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={() => {
        if (!pending) onClose()
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Fermer"
          disabled={pending}
          onClick={onClose}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>

        <p className={styles.switchLine}>
          {mode === 'signup' ? (
            <>
              Vous avez déjà un compte ?{' '}
              <button
                type="button"
                className={styles.switchBtn}
                onClick={() => {
                  setMode('signin')
                  setError(null)
                  setStatus(null)
                }}
              >
                Se connecter
              </button>
            </>
          ) : (
            <>
              Pas encore de compte ?{' '}
              <button
                type="button"
                className={styles.switchBtn}
                onClick={() => {
                  setMode('signup')
                  setError(null)
                  setStatus(null)
                }}
              >
                Créer un compte
              </button>
            </>
          )}
        </p>

        <div className={styles.oauthStack}>
          <button
            type="button"
            className={styles.oauthBtn}
            disabled={pending}
            onClick={() => void handleGoogle()}
          >
            <GoogleIcon />
            <span>Continuer avec Google</span>
          </button>
        </div>
        <div className={styles.divider} role="separator">
          {mode === 'signup' ? 'ou enregistrer avec un e-mail' : 'ou se connecter avec un e-mail'}
        </div>

        {mode === 'signup' ? (
          <form className={styles.form} onSubmit={(e) => void handleSignupEmail(e)} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="checkout-auth-email">
                E-mail
              </label>
              <input
                id="checkout-auth-email"
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

            <label className={styles.consent}>
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                disabled={pending}
              />
              <span>Je souhaite recevoir les actualités et offres Segna par e-mail.</span>
            </label>

            <p className={styles.legal}>
              En cliquant sur « Créer un compte », vous acceptez nos{' '}
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

            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} disabled={pending} onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className={styles.submitBtn} disabled={pending}>
                {pending ? 'Envoi…' : 'Créer un compte'}
              </button>
            </div>
          </form>
        ) : null}

        {mode === 'signin' ? (
          <form className={styles.form} onSubmit={(e) => void handleSignIn(e)} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="checkout-auth-email-signin">
                E-mail
              </label>
              <input
                id="checkout-auth-email-signin"
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
              <label className={styles.label} htmlFor="checkout-auth-password">
                Mot de passe
              </label>
              <input
                id="checkout-auth-password"
                className={styles.input}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                required
              />
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} disabled={pending} onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className={styles.submitBtn} disabled={pending}>
                {pending ? 'Connexion…' : 'Se connecter'}
              </button>
            </div>

            <button
              type="button"
              className={styles.switchBtn}
              style={{marginTop: 12, alignSelf: 'flex-start'}}
              disabled={pending}
              onClick={() => void handleSignInWithEmailOtp()}
            >
              Recevoir un code / lien par e-mail
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}


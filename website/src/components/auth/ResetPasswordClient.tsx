'use client'

import {AuthRecapWallAsides} from '@/components/subscription/AuthRecapWallAsides'
import {WaveDotsLoader} from '@/components/ui/WaveDotsLoader'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {mapAuthErrorMessage} from '@/lib/auth/map-auth-error'
import {getSignUpPasswordError, isSignUpPasswordValid} from '@/lib/auth/password'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useEffect, useState, type FormEvent} from 'react'
import styles from './checkoutAuthModal.module.css'
import pageStyles from './signupPage.module.css'

function PasswordEyeIcon({open}: {open: boolean}) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

const LEGAL = [
  {label: "Conditions Générales d'Utilisation", href: '/conditions-generales-utilisation'},
  {label: 'Politique de confidentialité', href: '/politique-confidentialite'},
  {label: 'Politique de cookies', href: '/politique-de-cookies'},
] as const

export function ResetPasswordClient() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [sessionOk, setSessionOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordVisible, setPasswordVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()

        // Lien recovery : tokens souvent dans le hash (implicit) ou déjà consommés par detectSessionInUrl.
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash
        const hashParams = new URLSearchParams(hash)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        if (accessToken && refreshToken) {
          const {error: sessionError} = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) throw sessionError
          window.history.replaceState(null, '', window.location.pathname)
        }

        try {
          sessionStorage.removeItem('segna_password_recovery')
        } catch {
          // ignore
        }

        const {data} = await supabase.auth.getSession()
        if (cancelled) return
        setSessionOk(Boolean(data.session))
        if (!data.session) {
          setError('Lien invalide ou expiré. Demande un nouveau lien de réinitialisation.')
        }
      } catch {
        if (!cancelled) {
          setSessionOk(false)
          setError('Session invalide. Demande un nouveau lien.')
        }
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending || !sessionOk) return
    setError(null)

    const passwordError = getSignUpPasswordError(password)
    if (passwordError) {
      setError(passwordError)
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const {error: updateError} = await supabase.auth.updateUser({password})
      if (updateError) {
        setError(
          mapAuthErrorMessage(updateError.message, 'Impossible de mettre à jour le mot de passe.'),
        )
        setPending(false)
        return
      }
      router.replace('/signin?notice=password_updated')
    } catch {
      setError('Impossible de mettre à jour le mot de passe.')
      setPending(false)
    }
  }

  const passwordOk = isSignUpPasswordValid(password) && password === confirm

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.shell}>
        <section className={pageStyles.formCol} aria-label="Nouveau mot de passe">
          <div className={pageStyles.formInner}>
            <Link href="/" className={pageStyles.brand} aria-label="Accueil Segna">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/segna-logo.svg" alt="Segna" className={pageStyles.brandLogo} width={120} height={36} />
            </Link>

            <p className={pageStyles.intro}>Choisis un nouveau mot de passe pour ton compte Segna.</p>

            <div className={pageStyles.card}>
              <div className={[styles.panel, styles.panelPage].join(' ')}>
                <h2 className={styles.title}>Nouveau mot de passe</h2>
                <p className={styles.switchLine}>
                  <Link href="/signin" className={styles.switchBtn}>
                    Retour à la connexion
                  </Link>
                </p>

                {checkingSession ? (
                  <WebsitePageLoading as="div" compact label="Vérification du lien" />
                ) : (
                  <form className={styles.form} onSubmit={(e) => void handleSubmit(e)} noValidate>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="reset-password">
                        Mot de passe*
                      </label>
                      <div className={styles.passwordWrap}>
                        <input
                          id="reset-password"
                          className={styles.input}
                          type={passwordVisible ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={pending || !sessionOk}
                          required
                          minLength={8}
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

                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="reset-password-confirm">
                        Confirmer*
                      </label>
                      <input
                        id="reset-password-confirm"
                        className={styles.input}
                        type={passwordVisible ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        disabled={pending || !sessionOk}
                        required
                        minLength={8}
                      />
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
                        disabled={pending || !sessionOk || !passwordOk}
                        data-ready={passwordOk && sessionOk ? 'true' : 'false'}
                      >
                        {pending ? <WaveDotsLoader /> : 'Enregistrer'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <nav className={pageStyles.legalNav} aria-label="Mentions légales">
              {LEGAL.map((item) => (
                <Link key={item.href} href={item.href} className={pageStyles.legalLink}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <AuthRecapWallAsides
          desktopClassName={pageStyles.visualCol}
          mobileClassName={pageStyles.visualColMobile}
        />
      </div>
    </div>
  )
}

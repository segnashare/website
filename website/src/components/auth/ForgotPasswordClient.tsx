'use client'

import {AuthRecapWallAsides} from '@/components/subscription/AuthRecapWallAsides'
import {WaveDotsLoader} from '@/components/ui/WaveDotsLoader'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {useSearchParams} from 'next/navigation'
import {useMemo, useState, type FormEvent} from 'react'
import styles from './checkoutAuthModal.module.css'
import pageStyles from './signupPage.module.css'

const LEGAL = [
  {label: "Conditions Générales d'Utilisation", href: '/conditions-generales-utilisation'},
  {label: 'Politique de confidentialité', href: '/politique-confidentialite'},
  {label: 'Politique de cookies', href: '/politique-de-cookies'},
] as const

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function ForgotPasswordClient() {
  const searchParams = useSearchParams()
  const initialEmail = useMemo(() => {
    const raw = searchParams.get('email')?.trim().toLowerCase() ?? ''
    return isValidEmail(raw) ? raw : ''
  }, [searchParams])

  const [email, setEmail] = useState(initialEmail)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
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
      const response = await fetch('/api/auth/user-exists', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: trimmed, mode: 'auth'}),
      })
      if (!response.ok) {
        setError('Impossible de vérifier ce compte pour le moment. Réessaie dans quelques instants.')
        setPending(false)
        return
      }
      const payload = (await response.json()) as {exists?: boolean}
      if (!payload.exists) {
        setError("Ce compte n'existe pas.")
        setPending(false)
        return
      }

      const supabase = createSupabaseBrowserClient()
      // URL exacte (sans query) — sinon Supabase ignore redirectTo et renvoie vers le Site URL (= app).
      const redirectTo = `${window.location.origin}/reset-password`
      const {error: resetError} = await supabase.auth.resetPasswordForEmail(trimmed, {redirectTo})
      if (resetError) {
        setError("Impossible d'envoyer le lien pour le moment. Réessaie dans quelques instants.")
        setPending(false)
        return
      }

      setStatus('Lien envoyé. Vérifie ta boîte e-mail (et les spams).')
    } catch {
      setError('Impossible d’envoyer le lien pour le moment.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.shell}>
        <section className={pageStyles.formCol} aria-label="Mot de passe oublié">
          <div className={pageStyles.formInner}>
            <Link href="/" className={pageStyles.brand} aria-label="Accueil Segna">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/segna-logo.svg" alt="Segna" className={pageStyles.brandLogo} width={120} height={36} />
            </Link>

            <p className={pageStyles.intro}>
              Indique ton e-mail : on t’envoie un lien pour définir un nouveau mot de passe.
            </p>

            <div className={pageStyles.card}>
              <div className={[styles.panel, styles.panelPage].join(' ')}>
                <h2 className={styles.title}>Mot de passe oublié</h2>
                <p className={styles.switchLine}>
                  Tu t’en souviens ?{' '}
                  <Link href="/signin" className={styles.switchBtn}>
                    Se connecter
                  </Link>
                </p>

                <form className={styles.form} onSubmit={(e) => void handleSubmit(e)} noValidate>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="forgot-email">
                      Adresse email*
                    </label>
                    <input
                      id="forgot-email"
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

                  {error ? (
                    <p className={styles.error} role="alert">
                      {error}
                    </p>
                  ) : null}
                  {status ? (
                    <p className={styles.status} role="status">
                      {status}
                    </p>
                  ) : null}

                  <div className={styles.footerPage}>
                    <button type="submit" className={styles.submitBtnPage} disabled={pending}>
                      {pending ? <WaveDotsLoader /> : 'Envoyer le lien'}
                    </button>
                  </div>
                </form>
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

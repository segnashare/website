'use client'

import {bootstrapUserAfterSignup} from '@/lib/auth/bootstrap-user'
import {
  isBanAddressSelectionValid,
  searchBanAddresses,
  type BanAddressSuggestion,
} from '@/lib/auth/ban-address-search'
import {
  isValidBirthDate,
  saveOnboardingBirthDate,
  saveOnboardingNameAndAddress,
  saveOnboardingSizes,
} from '@/lib/auth/checkout-onboarding-persist'
import {resolveCheckoutOnboardingResume} from '@/lib/auth/checkout-onboarding-resume'
import type {CheckoutOnboardingStep} from '@/lib/auth/checkout-onboarding-resume'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import type {User} from '@supabase/supabase-js'
import {useCallback, useEffect, useId, useRef, useState, type FormEvent} from 'react'
import {createPortal} from 'react-dom'
import styles from './checkoutSignupOnboardingModal.module.css'

const OTP_LENGTH = 6
const RESEND_SECONDS = 60
const TOP_OPTIONS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
const BOTTOM_OPTIONS = ['32', '34', '36', '38', '40', '42', '44', '46', '48'] as const
const SHOES_OPTIONS = Array.from({length: 12}, (_, i) => String(33 + i))

type Step = CheckoutOnboardingStep

type Props = {
  open: boolean
  email: string
  /** signup = onboarding 4 étapes ; signin = OTP puis reprise / checkout. */
  intent?: 'signup' | 'signin'
  /** Reprise après e-mail déjà validé (skip OTP). */
  initialStep?: CheckoutOnboardingStep
  /**
   * Après création mdp (page signup) : forcer l’étape OTP même si une session
   * est déjà présente (ne pas skipper la vérif e-mail).
   */
  forceEmailOtp?: boolean
  onClose: () => void
  onComplete: () => void
}

const STEP_META: Record<Step, {title: string; subtitle: string}> = {
  1: {
    title: 'Confirme ton e-mail',
    subtitle: 'Entre le code reçu pour sécuriser ton compte.',
  },
  2: {
    title: 'Qui es-tu ?',
    subtitle: 'Prénom, nom et adresse de livraison. Seul le quartier apparaît sur ton profil.',
  },
  3: {
    title: 'Quelle est ta date de naissance ?',
    subtitle: "Cela nous permet de calculer l'âge qui s'affiche sur ton profil.",
  },
  4: {
    title: 'Les tailles que tu pourrais porter',
    subtitle: 'Plusieurs tailles possibles par catégorie.',
  },
}

function isAuthLockError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === 'AbortError') return true
  const m = error.message.toLowerCase()
  return m.includes('lock broken') || m.includes('steal') || m.includes('aborted')
}

async function getAuthUserWithRetry(): Promise<User | null> {
  const supabase = createSupabaseBrowserClient()
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const {data, error} = await supabase.auth.getUser()
      if (error && isAuthLockError(error) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 60 + attempt * 80))
        continue
      }
      // Session corrompue / erreur client : ne pas faire échouer tout le step OTP.
      if (error) {
        console.warn('[checkout-onboarding] getUser', error.message)
        return null
      }
      return data.user ?? null
    } catch (e) {
      if (isAuthLockError(e) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 60 + attempt * 80))
        continue
      }
      console.warn('[checkout-onboarding] getUser exception', e)
      // Évite de remonter TypeError obscure (ex. regex JWT undefined après HMR).
      try {
        await supabase.auth.signOut({scope: 'local'})
      } catch {
        // ignore
      }
      return null
    }
  }
  return null
}

function isEmailVerified(user: User | null | undefined, email: string): boolean {
  if (!user?.email) return false
  if (user.email.toLowerCase() !== email.trim().toLowerCase()) return false
  return Boolean(user.email_confirmed_at)
}

function SizePill({
  label,
  selected,
  onToggle,
}: {
  label: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={`${styles.sizePill} ${selected ? styles.sizePillSelected : ''}`}
      aria-pressed={selected}
      onClick={onToggle}
    >
      <span>{label}</span>
      <span className={styles.sizePillIcon} aria-hidden>
        {selected ? '✓' : '+'}
      </span>
    </button>
  )
}

export function CheckoutSignupOnboardingModal({
  open,
  email,
  intent = 'signup',
  initialStep = 1,
  forceEmailOtp = false,
  onClose,
  onComplete,
}: Props) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const [otp, setOtp] = useState('')
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const [resendRemaining, setResendRemaining] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<BanAddressSuggestion[]>([])
  const [locationLoading, setLocationLoading] = useState(false)
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [activeLocationIndex, setActiveLocationIndex] = useState(-1)
  const [selectedLocation, setSelectedLocation] = useState<BanAddressSuggestion | null>(null)
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '', '', ''])
  const birthRefs = useRef<Array<HTMLInputElement | null>>([])
  const [topSelected, setTopSelected] = useState<Set<string>>(new Set())
  const [bottomSelected, setBottomSelected] = useState<Set<string>>(new Set())
  const [shoesSelected, setShoesSelected] = useState<Set<string>>(new Set())

  const isLocationValid = isBanAddressSelectionValid(locationQuery, selectedLocation)

  const selectLocationSuggestion = useCallback((suggestion: BanAddressSuggestion) => {
    setLocationQuery(suggestion.label)
    setSelectedLocation(suggestion)
    setShowLocationSuggestions(false)
    setActiveLocationIndex(-1)
    setLocationSuggestions([])
    setError(null)
  }, [])

  const otpChars = Array.from({length: OTP_LENGTH}, (_, i) => otp[i] ?? '')

  const setOtpDigit = (index: number, digit: string) => {
    const next = otpChars.slice()
    next[index] = digit
    setOtp(next.join(''))
  }

  const handleOtpPaste = (index: number, pastedRaw: string) => {
    const pasted = pastedRaw.replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    if (index === 0 || pasted.length > 1) {
      setOtp(pasted)
      otpRefs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus()
      return
    }
    setOtpDigit(index, pasted)
    if (index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus()
  }

  const day = `${digits[0]}${digits[1]}`
  const month = `${digits[2]}${digits[3]}`
  const year = `${digits[4]}${digits[5]}${digits[6]}${digits[7]}`

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const startStep = initialStep >= 2 && initialStep <= 4 ? initialStep : 1
    setStep(startStep)
    setPending(false)
    setError(null)
    setStatus(startStep === 1 ? 'Code envoyé. Vérifie les spams.' : null)
    setOtp('')
    setFirstName('')
    setLastName('')
    setLocationQuery('')
    setLocationSuggestions([])
    setLocationLoading(false)
    setShowLocationSuggestions(false)
    setActiveLocationIndex(-1)
    setSelectedLocation(null)
    setDigits(['', '', '', '', '', '', '', ''])
    setTopSelected(new Set())
    setBottomSelected(new Set())
    setShoesSelected(new Set())
    setResendRemaining(startStep === 1 ? RESEND_SECONDS : 0)

    // E-mail déjà validé (session) ou reprise : aller à l’étape nom / naissance / tailles.
    // Sauf après signup mdp (`forceEmailOtp`) où on exige le code de vérif.
    if (startStep >= 2 || forceEmailOtp) {
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      try {
        const user = await getAuthUserWithRetry()
        if (cancelled) return
        if (isEmailVerified(user, email)) {
          const supabase = createSupabaseBrowserClient()
          await bootstrapUserAfterSignup(supabase)
          if (cancelled) return
          const resume = await resolveCheckoutOnboardingResume(supabase)
          if (cancelled) return
          if (resume.status === 'ready') {
            onComplete()
            return
          }
          if (resume.status === 'resume' && resume.step >= 2) {
            setStep(resume.step)
            setStatus(null)
            return
          }
          setStep(2)
          setStatus(null)
        }
      } catch {
        // rester sur l’étape OTP
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, email, forceEmailOtp, initialStep, onComplete])

  useEffect(() => {
    if (!open || resendRemaining <= 0) return
    const id = window.setInterval(() => {
      setResendRemaining((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [open, resendRemaining])

  useEffect(() => {
    if (!open || step !== 2) return
    const query = locationQuery.trim()
    if (query.length < 3 || (selectedLocation && query === selectedLocation.label)) {
      setLocationSuggestions([])
      setActiveLocationIndex(-1)
      setLocationLoading(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setLocationLoading(true)
        try {
          const next = await searchBanAddresses(query, controller.signal)
          setLocationSuggestions(next)
          setActiveLocationIndex(next.length > 0 ? 0 : -1)
        } catch {
          setLocationSuggestions([])
          setActiveLocationIndex(-1)
        } finally {
          setLocationLoading(false)
        }
      })()
    }, 240)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [locationQuery, open, selectedLocation, step])

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

  const canContinue =
    !pending &&
    (step === 1
      ? otp.trim().length === OTP_LENGTH
      : step === 2
        ? firstName.trim().length >= 2 && isLocationValid
        : step === 3
          ? isValidBirthDate(day, month, year)
          : topSelected.size > 0 && bottomSelected.size > 0 && shoesSelected.size > 0)

  const handleResendOtp = async () => {
    if (pending || resendRemaining > 0) return
    setError(null)
    setStatus(null)
    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const {error: otpError} = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        // Après signup mdp le user existe déjà → ne pas recréer.
        options: {shouldCreateUser: intent === 'signup' && !forceEmailOtp},
      })
      if (otpError) {
        const msg = (otpError.message ?? '').toLowerCase()
        console.error('[checkout-onboarding] resend otp', otpError)
        if (msg.includes('rate limit') || msg.includes('login.new_email') || msg.includes('email rate') || msg.includes('after')) {
          setError('Trop de tentatives. Attends ~60 s avant de renvoyer le code.')
          setResendRemaining(RESEND_SECONDS)
        } else if (msg.includes('error sending') || msg.includes('confirmation email')) {
          setError("L'e-mail n'a pas pu être envoyé (SMTP). Vérifie Postmark / réessaie plus tard.")
        } else {
          setError(otpError.message || "Impossible de renvoyer le code pour le moment.")
        }
      } else {
        setStatus('Nouveau code envoyé. Vérifie les spams.')
        setResendRemaining(RESEND_SECONDS)
      }
    } catch (e) {
      console.error('[checkout-onboarding] resend otp exception', e)
      setError("Impossible de renvoyer le code.")
    } finally {
      setPending(false)
    }
  }

  const submitStep = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault()
      if (!canContinue || pending) return
      setError(null)
      setStatus(null)
      setPending(true)

      try {
        const supabase = createSupabaseBrowserClient()

        if (step === 1) {
          const normalizedEmail = email.trim().toLowerCase()
          const token = otp.trim()

          // Déjà connecté / e-mail déjà confirmé (OTP consommé) → on continue,
          // sauf si on force la vérif après création du mot de passe.
          const existingUser = await getAuthUserWithRetry()
          const alreadyVerified = isEmailVerified(existingUser, normalizedEmail)
          const mustVerifyOtp = forceEmailOtp || !alreadyVerified

          if (mustVerifyOtp) {
            let verifyError: {message?: string} | null = null
            try {
              verifyError =
                (
                  await supabase.auth.verifyOtp({
                    email: normalizedEmail,
                    token,
                    type: 'email',
                  })
                ).error ?? null

              // Certains templates / flux signup exigent `type: 'signup'`.
              if (verifyError) {
                const retry = await supabase.auth.verifyOtp({
                  email: normalizedEmail,
                  token,
                  type: 'signup',
                })
                verifyError = retry.error
              }
            } catch (verifyEx) {
              console.error('[checkout-onboarding] verify otp threw', verifyEx)
              const afterThrowUser = await getAuthUserWithRetry()
              if (forceEmailOtp || !isEmailVerified(afterThrowUser, normalizedEmail)) {
                const m = verifyEx instanceof Error ? verifyEx.message : ''
                setError(
                  m.includes('test')
                    ? 'Session locale invalide. Renvoie un nouveau code puis réessaie.'
                    : m || 'Vérification impossible.',
                )
                setPending(false)
                return
              }
              verifyError = null
            }

            if (verifyError) {
              const msg = (verifyError.message ?? '').toLowerCase()
              console.error('[checkout-onboarding] verify otp', verifyError)

              const afterFailUser = await getAuthUserWithRetry()
              const recovered = !forceEmailOtp && isEmailVerified(afterFailUser, normalizedEmail)

              if (!recovered) {
                if (msg.includes('expired')) {
                  setError('Code expiré. Renvoie un nouveau code.')
                } else if (msg.includes('invalid') || msg.includes('otp') || msg.includes('token')) {
                  setError("Ce n'est pas le bon code (ou il a déjà été utilisé). Renvoie un code si besoin.")
                } else {
                  setError(verifyError.message || 'Vérification impossible.')
                }
                setPending(false)
                return
              }
            }
          }

          const boot = await bootstrapUserAfterSignup(supabase)
          if (!boot.ok) {
            setError(boot.message)
            setPending(false)
            return
          }

          const resume = await resolveCheckoutOnboardingResume(supabase)
          if (resume.status === 'ready' || intent === 'signin') {
            if (resume.status === 'resume' && resume.step >= 2) {
              setStep(resume.step)
              setPending(false)
              return
            }
            if (resume.status === 'ready') {
              setPending(false)
              onComplete()
              return
            }
            // signin sans progression connue → prénom
            setStep(2)
            setPending(false)
            return
          }

          setStep(2)
          setPending(false)
          return
        }

        if (step === 2) {
          if (!selectedLocation || !isLocationValid) {
            setError('Sélectionne une adresse complète (rue + ville) dans la liste.')
            setPending(false)
            return
          }
          const result = await saveOnboardingNameAndAddress(supabase, firstName, lastName, {
            label: selectedLocation.label,
            relativeCity: selectedLocation.relativeCity,
            timezone: selectedLocation.timezone,
            lat: selectedLocation.lat,
            lon: selectedLocation.lon,
          })
          if (!result.ok) {
            setError(result.message)
            setPending(false)
            return
          }
          setStep(3)
          setPending(false)
          return
        }

        if (step === 3) {
          if (!isValidBirthDate(day, month, year)) {
            setError("Merci d'indiquer une date valide.")
            setPending(false)
            return
          }
          const isoDate = `${year}-${month}-${day}`
          const result = await saveOnboardingBirthDate(supabase, isoDate)
          if (!result.ok) {
            setError(result.message)
            setPending(false)
            return
          }
          setStep(4)
          setPending(false)
          return
        }

        const result = await saveOnboardingSizes(
          supabase,
          Array.from(topSelected),
          Array.from(bottomSelected),
          Array.from(shoesSelected),
        )
        if (!result.ok) {
          setError(result.message)
          setPending(false)
          return
        }
        setPending(false)
        onComplete()
      } catch (e) {
        console.error('[checkout-onboarding] submitStep', e)
        if (isAuthLockError(e)) {
          setError('Connexion en cours, réessaie dans une seconde.')
        } else {
          const message = e instanceof Error && e.message.trim() ? e.message : 'Une erreur est survenue. Réessaie.'
          setError(message)
        }
        setPending(false)
      }
    },
    [
      bottomSelected,
      canContinue,
      day,
      email,
      firstName,
      forceEmailOtp,
      intent,
      isLocationValid,
      lastName,
      month,
      onComplete,
      otp,
      pending,
      selectedLocation,
      shoesSelected,
      step,
      topSelected,
      year,
    ],
  )

  const goBack = () => {
    if (pending) return
    setError(null)
    setStatus(null)
    if (step === 1 || (step === 2 && initialStep >= 2)) {
      onClose()
      return
    }
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s))
  }

  const toggleSize = (zone: 'top' | 'bottom' | 'shoes', code: string) => {
    setError(null)
    const setter = zone === 'top' ? setTopSelected : zone === 'bottom' ? setBottomSelected : setShoesSelected
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  if (!open || !mounted) return null

  const meta = STEP_META[step]
  const progressPct = (step / 4) * 100

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
        <button type="button" className={styles.closeBtn} aria-label="Fermer" disabled={pending} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {meta.title}
          </h2>
          <p className={styles.subtitle}>{meta.subtitle}</p>
        </div>

        <div className={styles.progressTrack} aria-hidden>
          <div className={styles.progressFill} style={{width: `${progressPct}%`}} />
        </div>

        <div className={styles.body}>
          {step === 1 ? (
            <form id="checkout-onboarding-form" onSubmit={(e) => void submitStep(e)} noValidate>
              <p className={styles.otpHint}>
                Code à {OTP_LENGTH} chiffres envoyé à <strong>{email}</strong>.
              </p>
              <div className={styles.field}>
                <div className={styles.otpRow} role="group" aria-label="Code de vérification">
                  {otpChars.map((char, index) => (
                    <input
                      key={`otp-${index}`}
                      ref={(el) => {
                        otpRefs.current[index] = el
                      }}
                      className={styles.otpCell}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      autoFocus={index === 0}
                      maxLength={1}
                      value={char}
                      disabled={pending}
                      aria-label={`Chiffre ${index + 1} sur ${OTP_LENGTH}`}
                      onChange={(e) => {
                        setError(null)
                        const raw = e.target.value.replace(/\D/g, '')
                        if (raw.length > 1) {
                          handleOtpPaste(index, raw)
                          return
                        }
                        const digit = raw.slice(-1)
                        setOtpDigit(index, digit)
                        if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus()
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !otpChars[index] && index > 0) {
                          otpRefs.current[index - 1]?.focus()
                        }
                      }}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData('text')
                        if (!pasted.replace(/\D/g, '')) return
                        e.preventDefault()
                        setError(null)
                        handleOtpPaste(index, pasted)
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className={styles.resendBtn}
                disabled={pending || resendRemaining > 0}
                onClick={() => void handleResendOtp()}
              >
                {resendRemaining > 0 ? `Renvoyer dans ${resendRemaining}s` : 'Renvoyer le code'}
              </button>
            </form>
          ) : null}

          {step === 2 ? (
            <form id="checkout-onboarding-form" onSubmit={(e) => void submitStep(e)} noValidate>
              <div className={styles.framedStack}>
                <div className={styles.framedInput}>
                  <input
                    type="text"
                    autoComplete="given-name"
                    placeholder="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={pending}
                    required
                  />
                </div>
                <div className={styles.framedInput}>
                  <input
                    type="text"
                    autoComplete="family-name"
                    placeholder="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <div className={styles.addressWrap}>
                  <div className={styles.framedInput}>
                    <input
                      type="text"
                      autoComplete="street-address"
                      placeholder="Saisis ton adresse, ton quartier ou ta ville…"
                      value={locationQuery}
                      disabled={pending}
                      required
                      aria-autocomplete="list"
                      aria-expanded={showLocationSuggestions}
                      onFocus={() => setShowLocationSuggestions(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowLocationSuggestions(false), 120)
                      }}
                      onChange={(e) => {
                        setError(null)
                        setLocationQuery(e.target.value)
                        setSelectedLocation(null)
                        setShowLocationSuggestions(true)
                        setActiveLocationIndex(-1)
                      }}
                      onKeyDown={(e) => {
                        if (!showLocationSuggestions || locationSuggestions.length === 0) return
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setActiveLocationIndex((prev) => {
                            if (prev < 0) return 0
                            return Math.min(prev + 1, locationSuggestions.length - 1)
                          })
                          return
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setActiveLocationIndex((prev) => {
                            if (prev <= 0) return 0
                            return prev - 1
                          })
                          return
                        }
                        if (
                          e.key === 'Enter' &&
                          activeLocationIndex >= 0 &&
                          activeLocationIndex < locationSuggestions.length
                        ) {
                          e.preventDefault()
                          selectLocationSuggestion(locationSuggestions[activeLocationIndex]!)
                        }
                      }}
                    />
                  </div>
                  {showLocationSuggestions && (locationLoading || locationSuggestions.length > 0) ? (
                    <div className={styles.addressSuggestions} role="listbox" aria-label="Suggestions d’adresse">
                      {locationLoading ? (
                        <p className={styles.addressHint}>Recherche d’adresses…</p>
                      ) : (
                        locationSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            role="option"
                            aria-selected={index === activeLocationIndex}
                            className={`${styles.addressSuggestion} ${
                              index === activeLocationIndex ? styles.addressSuggestionActive : ''
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectLocationSuggestion(suggestion)
                            }}
                          >
                            <span className={styles.addressSuggestionLabel}>{suggestion.label}</span>
                            {suggestion.secondary ? (
                              <span className={styles.addressSuggestionSecondary}>{suggestion.secondary}</span>
                            ) : null}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </form>
          ) : null}

          {step === 3 ? (
            <form id="checkout-onboarding-form" onSubmit={(e) => void submitStep(e)} noValidate>
              <div className={styles.birthBox}>
                <div className={styles.birthRow}>
                  {digits.map((digit, index) => (
                    <div
                      key={`birth-${index}`}
                      className={`${styles.birthSlot} ${index === 2 || index === 4 ? styles.birthSlotGap : ''}`}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? 'bday-day' : 'off'}
                        placeholder={index < 2 ? 'j' : index < 4 ? 'm' : 'a'}
                        maxLength={1}
                        value={digit}
                        ref={(el) => {
                          birthRefs.current[index] = el
                        }}
                        disabled={pending}
                        onChange={(e) => {
                          setError(null)
                          const nextDigit = e.target.value.replace(/\D/g, '').slice(0, 1)
                          setDigits((prev) => {
                            const next = [...prev]
                            next[index] = nextDigit
                            return next
                          })
                          if (nextDigit && index < 7) birthRefs.current[index + 1]?.focus()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !digits[index] && index > 0) {
                            birthRefs.current[index - 1]?.focus()
                          }
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8)
                          if (!pasted) return
                          e.preventDefault()
                          const next = ['', '', '', '', '', '', '', '']
                          for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i] ?? ''
                          setDigits(next)
                          birthRefs.current[Math.min(pasted.length, 8) - 1]?.focus()
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </form>
          ) : null}

          {step === 4 ? (
            <form id="checkout-onboarding-form" onSubmit={(e) => void submitStep(e)} noValidate>
              <div className={styles.sizeSection}>
                <p className={styles.sizeHeading}>Haut</p>
                <div className={styles.sizePills}>
                  {TOP_OPTIONS.map((opt) => (
                    <SizePill
                      key={opt}
                      label={opt}
                      selected={topSelected.has(opt)}
                      onToggle={() => toggleSize('top', opt)}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.sizeSection}>
                <p className={styles.sizeHeading}>Bas</p>
                <div className={styles.sizePills}>
                  {BOTTOM_OPTIONS.map((opt) => (
                    <SizePill
                      key={opt}
                      label={opt}
                      selected={bottomSelected.has(opt)}
                      onToggle={() => toggleSize('bottom', opt)}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.sizeSection}>
                <p className={styles.sizeHeading}>Chaussures</p>
                <div className={styles.sizePills}>
                  {SHOES_OPTIONS.map((opt) => (
                    <SizePill
                      key={opt}
                      label={opt}
                      selected={shoesSelected.has(opt)}
                      onToggle={() => toggleSize('shoes', opt)}
                    />
                  ))}
                </div>
              </div>
            </form>
          ) : null}

          {error ? <p className={styles.error}>{error}</p> : null}
          {status && step === 1 ? <p className={styles.status}>{status}</p> : null}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.backBtn} disabled={pending} onClick={goBack}>
            {step === 1 ? 'Annuler' : 'Retour'}
          </button>
          <button
            type="submit"
            form="checkout-onboarding-form"
            className={styles.nextBtn}
            disabled={!canContinue}
          >
            {pending ? '…' : step === 4 ? 'Terminer' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}

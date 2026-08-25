'use client'

import {
  isBanAddressSelectionValid,
  searchBanAddresses,
  type BanAddressSuggestion,
} from '@/lib/auth/ban-address-search'
import {bootstrapUserAfterSignup} from '@/lib/auth/bootstrap-user'
import {
  isValidBirthDate,
  saveOnboardingAddress,
  saveOnboardingIdentity,
  saveOnboardingSizes,
} from '@/lib/auth/checkout-onboarding-persist'
import {resolveCheckoutOnboardingResume} from '@/lib/auth/checkout-onboarding-resume'
import type {CheckoutOnboardingStep} from '@/lib/auth/checkout-onboarding-resume'
import {APPAREL_SIZE_BANDS} from '@/lib/catalog/apparel-size-referential'
import {buildMapEmbedSrc, getDefaultMapCenter} from '@/lib/maps/google-maps-embed'
import {normalizeFrenchLocalNumber} from '@/lib/phone/fr-mobile'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {WaveDotsLoader} from '@/components/ui/WaveDotsLoader'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import type {User} from '@supabase/supabase-js'
import {useCallback, useEffect, useId, useRef, useState, type FormEvent} from 'react'
import {createPortal} from 'react-dom'
import styles from './checkoutSignupOnboardingModal.module.css'

function formatBirthDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

function parseBirthDigits(value: string): {day: string; month: string; year: string} {
  const d = value.replace(/\D/g, '').slice(0, 8)
  return {day: d.slice(0, 2), month: d.slice(2, 4), year: d.slice(4, 8)}
}

const OTP_LENGTH = 6
const RESEND_SECONDS = 30

const TOP_OPTIONS = APPAREL_SIZE_BANDS.map((b) => b.letter)
const BOTTOM_OPTIONS = APPAREL_SIZE_BANDS.map((b) => b.fr)
const TOP_LABEL_BY_CODE = Object.fromEntries(APPAREL_SIZE_BANDS.map((b) => [b.letter, b.label])) as Record<
  string,
  string
>
const BOTTOM_LABEL_BY_CODE = Object.fromEntries(APPAREL_SIZE_BANDS.map((b) => [b.fr, b.label])) as Record<
  string,
  string
>
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
  /**
   * Tunnel achat panier : après validation e-mail seulement → `onComplete`
   * (identité / adresse se font sur la page checkout, pas en modale).
   */
  emailOtpOnly?: boolean
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
    subtitle: 'Prénom, nom, téléphone et date de naissance.',
  },
  3: {
    title: 'Où livrer tes pièces ?',
    subtitle: 'Seul le quartier apparaît sur ton profil.',
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
  emailOtpOnly = false,
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
  const [phoneLocal, setPhoneLocal] = useState('')
  const [birthInput, setBirthInput] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<BanAddressSuggestion[]>([])
  const [locationLoading, setLocationLoading] = useState(false)
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [activeLocationIndex, setActiveLocationIndex] = useState(-1)
  const [selectedLocation, setSelectedLocation] = useState<BanAddressSuggestion | null>(null)
  const [mapCenter, setMapCenter] = useState(getDefaultMapCenter)
  const [topSelected, setTopSelected] = useState<Set<string>>(new Set())
  const [bottomSelected, setBottomSelected] = useState<Set<string>>(new Set())
  const [shoesSelected, setShoesSelected] = useState<Set<string>>(new Set())
  const [identityErrors, setIdentityErrors] = useState<{
    firstName: boolean
    phone: boolean
    birth: boolean
  }>({firstName: false, phone: false, birth: false})
  const [locationError, setLocationError] = useState(false)

  const isLocationValid = isBanAddressSelectionValid(locationQuery, selectedLocation)
  /** Même règle que l’app `OnboardingPhoneCore` : 9 chiffres nationaux. */
  const phoneOk = normalizeFrenchLocalNumber(phoneLocal).length === 9
  const {day, month, year} = parseBirthDigits(birthInput)
  const birthOk = isValidBirthDate(day, month, year)
  const firstNameOk = firstName.trim().length >= 2

  useEffect(() => {
    if (!open) return
    trackWebsiteEvent('onboarding_signup_step_reached', {
      step: `website_checkout_onboarding_${step}`,
    })
  }, [open, step])

  const finishOnboarding = useCallback(() => {
    trackWebsiteEvent('onboarding_completed', {path: 'website_checkout_onboarding'})
    onComplete()
  }, [onComplete])

  const selectLocationSuggestion = useCallback((suggestion: BanAddressSuggestion) => {
    setLocationQuery(suggestion.label)
    setSelectedLocation(suggestion)
    setMapCenter({lat: suggestion.lat, lon: suggestion.lon})
    setShowLocationSuggestions(false)
    setActiveLocationIndex(-1)
    setLocationSuggestions([])
    setLocationError(false)
    setError(null)
  }, [])

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible sur cet appareil.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapCenter({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
        setError(null)
      },
      () => {
        setError('Impossible de récupérer ta position actuelle.')
      },
      {enableHighAccuracy: true, timeout: 7000},
    )
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
    setPhoneLocal('')
    setBirthInput('')
    setLocationQuery('')
    setLocationSuggestions([])
    setLocationLoading(false)
    setShowLocationSuggestions(false)
    setActiveLocationIndex(-1)
    setSelectedLocation(null)
    setMapCenter(getDefaultMapCenter())
    setTopSelected(new Set())
    setBottomSelected(new Set())
    setShoesSelected(new Set())
    setIdentityErrors({firstName: false, phone: false, birth: false})
    setLocationError(false)
    setResendRemaining(startStep === 1 ? RESEND_SECONDS : 0)

    if (startStep >= 2) {
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
          if (emailOtpOnly || resume.status === 'ready' || resume.status === 'need_phone_verify') {
            finishOnboarding()
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
  }, [open, email, emailOtpOnly, initialStep, onComplete])

  useEffect(() => {
    if (!open || resendRemaining <= 0) return
    const id = window.setInterval(() => {
      setResendRemaining((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [open, resendRemaining])

  useEffect(() => {
    if (!open || step !== 3) return
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

  /** Étape 1 : bouton actif seulement avec OTP complet. Autres : toujours cliquable pour afficher les erreurs. */
  const canContinue =
    !pending && (step === 1 ? otp.trim().length === OTP_LENGTH : true)

  const handleResendOtp = async () => {
    if (pending || resendRemaining > 0) return
    setError(null)
    setStatus(null)
    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const normalizedEmail = email.trim().toLowerCase()

      // Si l’e-mail est déjà confirmé, ne pas renvoyer de Magic Link : avancer.
      const existingUser = await getAuthUserWithRetry()
      if (isEmailVerified(existingUser, normalizedEmail)) {
        await bootstrapUserAfterSignup(supabase)
        if (emailOtpOnly) {
          finishOnboarding()
          return
        }
        const resume = await resolveCheckoutOnboardingResume(supabase)
        if (resume.status === 'ready' || resume.status === 'need_phone_verify') {
          finishOnboarding()
          return
        }
        if (resume.status === 'resume' && resume.step >= 2) {
          setStep(resume.step)
          setStatus(null)
          return
        }
        setStep(2)
        setStatus(null)
        return
      }

      // Inscription : toujours « Confirm signup » (code). Jamais signInWithOtp
      // (template Magic Link — c’est ce qui envoyait « Your Magic Link »).
      const {error: otpError} =
        intent === 'signup'
          ? await supabase.auth.resend({type: 'signup', email: normalizedEmail})
          : await supabase.auth.signInWithOtp({
              email: normalizedEmail,
              options: {shouldCreateUser: false},
            })
      if (otpError) {
        const msg = (otpError.message ?? '').toLowerCase()
        console.error('[checkout-onboarding] resend otp', otpError)
        if (msg.includes('rate limit') || msg.includes('login.new_email') || msg.includes('email rate') || msg.includes('after')) {
          setError('Trop de tentatives. Attends un peu avant de renvoyer le code.')
          setResendRemaining(RESEND_SECONDS)
        } else if (msg.includes('already') || msg.includes('confirmed') || msg.includes('verified')) {
          if (emailOtpOnly) finishOnboarding()
          else {
            setStep(2)
            setStatus(null)
          }
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
          if (resume.status === 'ready' || resume.status === 'need_phone_verify') {
            setPending(false)
            finishOnboarding()
            return
          }
          if (intent === 'signin') {
            if (resume.status === 'resume' && resume.step >= 2) {
              setStep(resume.step)
              setPending(false)
              return
            }
            setStep(2)
            setPending(false)
            return
          }

          setStep(2)
          setPending(false)
          return
        }

        if (step === 2) {
          const nextErrors = {
            firstName: !firstNameOk,
            phone: !phoneOk,
            birth: !birthOk,
          }
          setIdentityErrors(nextErrors)
          if (nextErrors.firstName || nextErrors.phone || nextErrors.birth) {
            if (nextErrors.firstName) setError('Indique ton prénom (2 caractères minimum).')
            else if (nextErrors.phone) setError('Saisis un numéro de mobile français valide (10 chiffres, ex. 06…).')
            else setError("Merci d'indiquer une date de naissance valide (JJ/MM/AAAA).")
            setPending(false)
            return
          }
          const isoDate = `${year}-${month}-${day}`
          const result = await saveOnboardingIdentity(supabase, firstName, lastName, phoneLocal, isoDate)
          if (!result.ok) {
            setError(result.message)
            setPending(false)
            return
          }
          setIdentityErrors({firstName: false, phone: false, birth: false})
          setStep(3)
          setPending(false)
          return
        }

        if (step === 3) {
          if (!selectedLocation || !isLocationValid) {
            setLocationError(true)
            setError('Sélectionne une adresse complète (rue + ville) dans la liste.')
            setPending(false)
            return
          }
          setLocationError(false)
          const result = await saveOnboardingAddress(supabase, {
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
          setStep(4)
          setPending(false)
          return
        }

        if (topSelected.size === 0 || bottomSelected.size === 0 || shoesSelected.size === 0) {
          setError('Sélectionne au moins une taille par catégorie (haut, bas, chaussures).')
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
        finishOnboarding()
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
      birthOk,
      bottomSelected,
      canContinue,
      day,
      email,
      firstName,
      firstNameOk,
      forceEmailOtp,
      intent,
      isLocationValid,
      lastName,
      month,
      onComplete,
      otp,
      pending,
      phoneLocal,
      phoneOk,
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
  const mapSrc = buildMapEmbedSrc(mapCenter.lat, mapCenter.lon)

  const dialog = (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={() => {
        if (!pending) onClose()
      }}
    >
      <div
        className={`${styles.dialog} ${step === 3 ? styles.dialogWithMap : ''}`}
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
                <div
                  className={`${styles.framedInput} ${identityErrors.firstName ? styles.framedInputInvalid : ''}`}
                >
                  <input
                    type="text"
                    autoComplete="given-name"
                    placeholder="Prénom"
                    value={firstName}
                    aria-invalid={identityErrors.firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value)
                      if (identityErrors.firstName) {
                        setIdentityErrors((prev) => ({...prev, firstName: false}))
                      }
                      if (error) setError(null)
                    }}
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
                <div className={`${styles.framedInput} ${identityErrors.phone ? styles.framedInputInvalid : ''}`}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel-national"
                    placeholder="Numéro de téléphone"
                    maxLength={10}
                    value={phoneLocal}
                    aria-invalid={identityErrors.phone}
                    disabled={pending}
                    required
                    onChange={(e) => {
                      setError(null)
                      setPhoneLocal(e.target.value.replace(/\D/g, '').slice(0, 10))
                      if (identityErrors.phone) {
                        setIdentityErrors((prev) => ({...prev, phone: false}))
                      }
                    }}
                  />
                </div>
                <div className={`${styles.framedInput} ${identityErrors.birth ? styles.framedInputInvalid : ''}`}>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday"
                    placeholder="Date de naissance"
                    value={birthInput}
                    disabled={pending}
                    required
                    aria-invalid={identityErrors.birth}
                    aria-label="Date de naissance (JJ/MM/AAAA)"
                    onChange={(e) => {
                      setError(null)
                      setBirthInput(formatBirthDisplay(e.target.value))
                      if (identityErrors.birth) {
                        setIdentityErrors((prev) => ({...prev, birth: false}))
                      }
                    }}
                  />
                </div>
              </div>
            </form>
          ) : null}

          {step === 3 ? (
            <form id="checkout-onboarding-form" onSubmit={(e) => void submitStep(e)} noValidate>
              <div className={styles.addressStep}>
                <div className={styles.mapBlock}>
                  <iframe
                    title="Carte de localisation"
                    src={mapSrc}
                    className={styles.mapFrame}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                  <button
                    type="button"
                    className={styles.mapLocateBtn}
                    aria-label="Centrer la carte sur ma position"
                    disabled={pending}
                    onClick={handleLocateMe}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                      <path
                        d="M12 2v3M12 19v3M2 12h3M19 12h3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                <div className={styles.addressWrap}>
                  <div className={`${styles.framedInput} ${locationError ? styles.framedInputInvalid : ''}`}>
                    <input
                      type="text"
                      autoComplete="street-address"
                      placeholder="Adresse"
                      value={locationQuery}
                      disabled={pending}
                      required
                      aria-invalid={locationError}
                      aria-autocomplete="list"
                      aria-expanded={showLocationSuggestions}
                      onFocus={() => setShowLocationSuggestions(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowLocationSuggestions(false), 120)
                      }}
                      onChange={(e) => {
                        setError(null)
                        setLocationError(false)
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

          {step === 4 ? (
            <form id="checkout-onboarding-form" onSubmit={(e) => void submitStep(e)} noValidate>
              <div className={styles.sizeSection}>
                <p className={styles.sizeHeading}>Haut</p>
                <div className={styles.sizePills}>
                  {TOP_OPTIONS.map((opt) => (
                    <SizePill
                      key={opt}
                      label={TOP_LABEL_BY_CODE[opt] ?? opt}
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
                      label={BOTTOM_LABEL_BY_CODE[opt] ?? opt}
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
            {pending ? <WaveDotsLoader /> : step === 4 ? 'Terminer' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}

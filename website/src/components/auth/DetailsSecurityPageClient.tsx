'use client'

import {AccountSectionShell} from '@/components/auth/AccountSectionShell'
import {
  isValidBirthDate,
} from '@/lib/auth/checkout-onboarding-persist'
import {
  sendCheckoutPhoneOtp,
  verifyCheckoutPhoneOtp,
} from '@/lib/auth/checkout-phone'
import {
  formatFrenchPhoneDisplay,
  normalizeFrenchLocalNumber,
  normalizeFrenchPhoneToE164,
} from '@/lib/phone/fr-mobile'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {WaveDotsLoader} from '@/components/ui/WaveDotsLoader'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {createPortal} from 'react-dom'
import styles from './detailsSecurityPage.module.css'

const OTP_LENGTH = 6
const RESEND_SECONDS = 30
const PRIVACY_HREF = '/politique-confidentialite'

type DetailsState = {
  userId: string
  firstName: string
  lastName: string
  email: string
  phoneDisplay: string
  phoneVerified: boolean
  birthDateIso: string | null
}

function capitalizeFirstLetter(value: string): string {
  const t = value.trim()
  if (!t) return t
  return t.charAt(0).toLocaleUpperCase('fr-FR') + t.slice(1)
}

function formatBirthIsoDisplay(iso: string | null): string {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

function isoToBirthDigits(iso: string | null): string {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return ''
  return `${m[3]}${m[2]}${m[1]}`
}

function formatBirthInputDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

function parseBirthDigits(value: string): {day: string; month: string; year: string} {
  const d = value.replace(/\D/g, '').slice(0, 8)
  return {day: d.slice(0, 2), month: d.slice(2, 4), year: d.slice(4, 8)}
}

type RpcUntyped = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{data?: unknown; error?: {message?: string} | null}>

function rpcOf(supabase: ReturnType<typeof createSupabaseBrowserClient>): RpcUntyped {
  return supabase.rpc.bind(supabase) as unknown as RpcUntyped
}

export function DetailsSecurityPageClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<DetailsState | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{kind: 'ok' | 'err'; text: string} | null>(null)

  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editBirthDigits, setEditBirthDigits] = useState('')

  const [phoneModal, setPhoneModal] = useState<'input' | 'otp' | null>(null)
  const [phoneLocal, setPhoneLocal] = useState('')
  const [otp, setOtp] = useState('')
  const [otpPhoneE164, setOtpPhoneE164] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalStatus, setModalStatus] = useState<string | null>(null)
  const [resendRemaining, setResendRemaining] = useState(0)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const phoneTitleId = useId()
  const otpTitleId = useId()

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const {
      data: {user},
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace(`/signin?next=${encodeURIComponent('/profil/details')}`)
      return
    }

    const [{data: member}, {data: profileRow}] = await Promise.all([
      supabase
        .from('users')
        .select('first_name, last_name, email, phone, birth_date')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.from('user_profiles').select('profile_data').eq('user_id', user.id).maybeSingle(),
    ])

    const m = member as {
      first_name?: string | null
      last_name?: string | null
      email?: string | null
      phone?: string | null
      birth_date?: string | null
    } | null
    const profileData = ((profileRow as {profile_data?: Record<string, unknown> | null} | null)
      ?.profile_data ?? {}) as Record<string, unknown>
    const profilePhone =
      typeof profileData.phone_e164 === 'string' ? profileData.phone_e164.trim() : ''
    const usersPhone = typeof m?.phone === 'string' ? m.phone.trim() : ''
    const authPhone = typeof user.phone === 'string' ? user.phone.trim() : ''
    const phoneCodeVerified = profileData.phone_code_verified === true
    const phoneConfirmed = Boolean(user.phone_confirmed_at) || phoneCodeVerified
    const rawPhone =
      (phoneConfirmed && (usersPhone || profilePhone || authPhone)) ||
      profilePhone ||
      usersPhone ||
      authPhone
    const birthFromUser =
      typeof m?.birth_date === 'string' && m.birth_date.trim() ? m.birth_date.trim() : null
    const birthFromProfile =
      typeof profileData.birth_date === 'string' && profileData.birth_date.trim()
        ? profileData.birth_date.trim()
        : null

    const next: DetailsState = {
      userId: user.id,
      firstName: typeof m?.first_name === 'string' ? m.first_name.trim() : '',
      lastName: typeof m?.last_name === 'string' ? m.last_name.trim() : '',
      email: (typeof m?.email === 'string' && m.email.trim()) || user.email?.trim() || '',
      phoneDisplay: rawPhone ? formatFrenchPhoneDisplay(rawPhone) || rawPhone : '',
      phoneVerified: phoneConfirmed && Boolean(rawPhone),
      birthDateIso: birthFromUser || birthFromProfile,
    }
    setDetails(next)
    setEditFirstName(next.firstName)
    setEditLastName(next.lastName)
    setEditBirthDigits(isoToBirthDigits(next.birthDateIso))
  }, [router])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await load()
      } catch {
        if (!cancelled) router.replace(`/signin?next=${encodeURIComponent('/profil/details')}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load, router])

  useEffect(() => {
    if (phoneModal !== 'otp' || resendRemaining <= 0) return
    const id = window.setInterval(() => {
      setResendRemaining((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [phoneModal, resendRemaining])

  const closePhoneModals = useCallback(() => {
    setPhoneModal(null)
    setPhoneLocal('')
    setOtp('')
    setOtpPhoneE164(null)
    setModalError(null)
    setModalStatus(null)
    setResendRemaining(0)
  }, [])

  useEffect(() => {
    if (!phoneModal) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) closePhoneModals()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [phoneModal, pending, closePhoneModals])

  const startEdit = () => {
    if (!details) return
    setFeedback(null)
    setEditFirstName(details.firstName)
    setEditLastName(details.lastName)
    setEditBirthDigits(isoToBirthDigits(details.birthDateIso))
    setEditMode(true)
  }

  const cancelEdit = () => {
    if (!details) return
    setEditMode(false)
    setEditFirstName(details.firstName)
    setEditLastName(details.lastName)
    setEditBirthDigits(isoToBirthDigits(details.birthDateIso))
    setFeedback(null)
  }

  const saveEdit = async () => {
    if (!details || pending) return
    setFeedback(null)

    const firstName = capitalizeFirstLetter(editFirstName)
    const lastName = capitalizeFirstLetter(editLastName)
    if (!firstName) {
      setFeedback({kind: 'err', text: 'Indique ton prénom.'})
      return
    }

    const {day, month, year} = parseBirthDigits(editBirthDigits)
    const hasBirth = editBirthDigits.replace(/\D/g, '').length > 0
    let isoBirth: string | null = null
    if (hasBirth) {
      if (!isValidBirthDate(day, month, year)) {
        setFeedback({kind: 'err', text: 'Date de naissance invalide (JJ/MM/AAAA).'})
        return
      }
      isoBirth = `${year}-${month}-${day}`
    }

    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const rpc = rpcOf(supabase)
      const settingsResult = await rpc('update_user_account_settings', {
        p_locale: null,
        p_timezone: null,
        p_first_name: firstName,
        p_last_name: lastName || null,
        p_request_id: crypto.randomUUID(),
      })
      if (settingsResult.error) {
        setFeedback({
          kind: 'err',
          text: settingsResult.error.message ?? "Impossible d'enregistrer ton nom.",
        })
        return
      }

      if (isoBirth) {
        const birthRpc = await rpc('set_user_birth_date', {
          p_birth_date: isoBirth,
          p_request_id: crypto.randomUUID(),
        })
        if (birthRpc.error) {
          setFeedback({
            kind: 'err',
            text: birthRpc.error.message ?? "Impossible d'enregistrer ta date de naissance.",
          })
          return
        }
        const birthProfile = await rpc('update_user_profile_public', {
          p_profile_json: {
            profile_data: {
              birth_date: isoBirth,
              age: {visibility: true},
            },
          },
          p_request_id: crypto.randomUUID(),
        })
        if (birthProfile.error) {
          setFeedback({
            kind: 'err',
            text: birthProfile.error.message ?? 'Impossible de mettre à jour le profil.',
          })
          return
        }
      }

      setEditMode(false)
      setFeedback({kind: 'ok', text: 'Informations mises à jour.'})
      await load()
    } catch {
      setFeedback({kind: 'err', text: 'Une erreur est survenue. Réessaie.'})
    } finally {
      setPending(false)
    }
  }

  const sendPasswordResetLink = async () => {
    if (!details?.email || pending) return
    setFeedback(null)
    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const redirectTo = `${window.location.origin}/reset-password`
      const {error} = await supabase.auth.resetPasswordForEmail(details.email, {redirectTo})
      if (error) {
        setFeedback({
          kind: 'err',
          text: "Impossible d'envoyer le lien pour le moment. Réessaie dans quelques instants.",
        })
        return
      }
      setFeedback({
        kind: 'ok',
        text: `Lien envoyé à ${details.email}. Vérifie ta boîte e-mail (et les spams).`,
      })
    } catch {
      setFeedback({kind: 'err', text: "Impossible d'envoyer le lien pour le moment."})
    } finally {
      setPending(false)
    }
  }

  const openAddPhoneModal = () => {
    setFeedback(null)
    setModalError(null)
    setModalStatus(null)
    setPhoneLocal('')
    setOtp('')
    setOtpPhoneE164(null)
    setPhoneModal('input')
  }

  const submitPhoneInput = async (e?: FormEvent) => {
    e?.preventDefault()
    if (pending) return
    setModalError(null)
    setModalStatus(null)

    const e164 = normalizeFrenchPhoneToE164(phoneLocal)
    if (!e164 || normalizeFrenchLocalNumber(phoneLocal).length !== 9) {
      setModalError('Saisis un numéro de mobile français valide.')
      return
    }

    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const result = await sendCheckoutPhoneOtp(supabase, e164)
      if (!result.ok) {
        setModalError(result.message)
        return
      }
      setOtpPhoneE164(result.e164)
      setOtp('')
      setModalStatus('Code envoyé par SMS. Vérifie ton téléphone.')
      setResendRemaining(RESEND_SECONDS)
      setPhoneModal('otp')
    } catch {
      setModalError("Impossible d'envoyer le code SMS.")
    } finally {
      setPending(false)
    }
  }

  const resendOtp = async () => {
    if (!otpPhoneE164 || pending || resendRemaining > 0) return
    setModalError(null)
    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const result = await sendCheckoutPhoneOtp(supabase, otpPhoneE164)
      if (!result.ok) {
        setModalError(result.message)
        return
      }
      setModalStatus('Nouveau code envoyé.')
      setResendRemaining(RESEND_SECONDS)
    } catch {
      setModalError("Impossible de renvoyer le code.")
    } finally {
      setPending(false)
    }
  }

  const submitOtp = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!otpPhoneE164 || pending) return
    const code = otp.replace(/\D/g, '')
    if (code.length !== OTP_LENGTH) {
      setModalError('Saisis le code à 6 chiffres.')
      return
    }
    setPending(true)
    setModalError(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const result = await verifyCheckoutPhoneOtp(supabase, otpPhoneE164, code)
      if (!result.ok) {
        setModalError(result.message)
        setOtp('')
        return
      }
      closePhoneModals()
      setFeedback({kind: 'ok', text: 'Numéro de téléphone confirmé.'})
      await load()
    } catch {
      setModalError('Vérification impossible.')
    } finally {
      setPending(false)
    }
  }

  const requestDelete = async () => {
    if (!details || pending) return
    const ok = window.confirm(
      'Confirmer la suppression de ton compte ?\n\nTon profil, tes looks et tes médias seront supprimés. L’historique de tes commandes est conservé par Segna.\n\nImpossible tant que des commandes ou retours sont encore ouverts.',
    )
    if (!ok) return

    setFeedback(null)
    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const {
        data: {session},
      } = await supabase.auth.getSession()
      const token = session?.access_token?.trim()
      if (!token) {
        setFeedback({kind: 'err', text: 'Session expirée — reconnecte-toi.'})
        return
      }

      const appBase = (process.env.NEXT_PUBLIC_SEGNA_APP_URL || 'https://app.segnashare.com').replace(
        /\/+$/,
        '',
      )
      const res = await fetch(`${appBase}/api/account/delete/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const payload = (await res.json().catch(() => null)) as {
        ok?: boolean
        blocked?: boolean
        error?: string
      } | null

      if (!res.ok) {
        setFeedback({
          kind: 'err',
          text: payload?.error ?? 'Impossible de supprimer ton compte pour le moment.',
        })
        return
      }
      if (payload?.blocked) {
        setFeedback({
          kind: 'err',
          text: 'Impossible de supprimer le compte pour le moment : des commandes ou envois sont encore en cours.',
        })
        return
      }

      await supabase.auth.signOut()
      window.location.href = '/auth?deleted=1'
    } catch {
      setFeedback({kind: 'err', text: 'Impossible de supprimer ton compte pour le moment.'})
    } finally {
      setPending(false)
    }
  }

  if (loading || !details) {
    return <WebsitePageLoading label="Chargement des détails" />
  }

  const otpChars = Array.from({length: OTP_LENGTH}, (_, i) => otp[i] ?? '')
  const setOtpDigit = (index: number, digit: string) => {
    const next = otpChars.slice()
    next[index] = digit
    setOtp(next.join(''))
  }

  const phoneInputModal =
    phoneModal === 'input' && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={styles.backdrop}
            role="presentation"
            onClick={() => {
              if (!pending) closePhoneModals()
            }}
          >
            <div
              className={styles.dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby={phoneTitleId}
              onClick={(ev) => ev.stopPropagation()}
            >
              <button
                type="button"
                className={styles.dialogClose}
                aria-label="Fermer"
                disabled={pending}
                onClick={closePhoneModals}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <div className={styles.dialogHeader}>
                <h2 id={phoneTitleId} className={styles.dialogTitle}>
                  Ajouter un téléphone
                </h2>
                <p className={styles.dialogSubtitle}>
                  Le numéro doit être unique et sera confirmé par SMS.
                </p>
              </div>
              <form id="profile-phone-input-form" onSubmit={(ev) => void submitPhoneInput(ev)}>
                <div className={styles.dialogBody}>
                  <div className={styles.phonePrefixRow}>
                    <span className={styles.phonePrefix}>+33</span>
                    <input
                      className={styles.input}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="6 12 34 56 78"
                      maxLength={10}
                      value={phoneLocal}
                      disabled={pending}
                      autoFocus
                      onChange={(e) => {
                        setModalError(null)
                        setPhoneLocal(e.target.value.replace(/\D/g, '').slice(0, 10))
                      }}
                    />
                  </div>
                  {modalError ? <p className={`${styles.feedback} ${styles.feedbackErr}`}>{modalError}</p> : null}
                </div>
                <div className={styles.dialogFooter}>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    disabled={pending}
                    onClick={closePhoneModals}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={pending || normalizeFrenchLocalNumber(phoneLocal).length !== 9}
                  >
                    {pending ? <WaveDotsLoader /> : 'Envoyer le code'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null

  const phoneOtpModal =
    phoneModal === 'otp' && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={styles.backdrop}
            role="presentation"
            onClick={() => {
              if (!pending) closePhoneModals()
            }}
          >
            <div
              className={styles.dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby={otpTitleId}
              onClick={(ev) => ev.stopPropagation()}
            >
              <button
                type="button"
                className={styles.dialogClose}
                aria-label="Fermer"
                disabled={pending}
                onClick={closePhoneModals}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <div className={styles.dialogHeader}>
                <h2 id={otpTitleId} className={styles.dialogTitle}>
                  Confirme ton numéro
                </h2>
                <p className={styles.dialogSubtitle}>
                  Code à {OTP_LENGTH} chiffres envoyé au{' '}
                  <strong>
                    {otpPhoneE164 ? formatFrenchPhoneDisplay(otpPhoneE164) || otpPhoneE164 : '—'}
                  </strong>
                  .
                </p>
              </div>
              <form id="profile-phone-otp-form" onSubmit={(ev) => void submitOtp(ev)}>
                <div className={styles.dialogBody}>
                  <div className={styles.otpRow} role="group" aria-label="Code SMS">
                    {otpChars.map((char, index) => (
                      <input
                        key={`sms-otp-${index}`}
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
                          setModalError(null)
                          const raw = e.target.value.replace(/\D/g, '')
                          if (raw.length > 1) {
                            const pasted = raw.slice(0, OTP_LENGTH)
                            setOtp(pasted)
                            otpRefs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus()
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
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.resendBtn}
                    disabled={pending || resendRemaining > 0}
                    onClick={() => void resendOtp()}
                  >
                    {resendRemaining > 0 ? `Renvoyer dans ${resendRemaining}s` : 'Renvoyer le code'}
                  </button>
                  {modalError ? (
                    <p className={`${styles.feedback} ${styles.feedbackErr}`}>{modalError}</p>
                  ) : null}
                  {modalStatus && !modalError ? (
                    <p className={`${styles.feedback} ${styles.feedbackOk}`}>{modalStatus}</p>
                  ) : null}
                </div>
                <div className={styles.dialogFooter}>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    disabled={pending}
                    onClick={() => {
                      setPhoneModal('input')
                      setOtp('')
                      setModalError(null)
                    }}
                  >
                    Modifier le numéro
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={pending || otp.replace(/\D/g, '').length !== OTP_LENGTH}
                  >
                    {pending ? <WaveDotsLoader /> : 'Confirmer'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <AccountSectionShell
      title="Détails et sécurité"
      lead="Gérer votre identifiant, vos informations personnelles et votre mot de passe."
    >
      <div className={styles.embedded}>
      <section className={styles.section} aria-labelledby="details-info">
        <h2 id="details-info" className={styles.sectionTitle}>
          Informations personnelles
        </h2>

        {editMode ? (
          <div className={styles.dl}>
            <div className={styles.row}>
              <span className={styles.dt}>Prénom</span>
              <div className={styles.dd}>
                <label className={styles.field}>
                  <span className={styles.srOnly}>Prénom</span>
                  <input
                    className={styles.input}
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    autoComplete="given-name"
                    disabled={pending}
                  />
                </label>
              </div>
            </div>
            <div className={styles.row}>
              <span className={styles.dt}>Nom</span>
              <div className={styles.dd}>
                <label className={styles.field}>
                  <span className={styles.srOnly}>Nom</span>
                  <input
                    className={styles.input}
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    autoComplete="family-name"
                    disabled={pending}
                  />
                </label>
              </div>
            </div>
            <div className={styles.row}>
              <span className={styles.dt}>Adresse e-mail</span>
              <div className={styles.dd}>{details.email || <span className={styles.muted}>—</span>}</div>
            </div>
            <div className={styles.row}>
              <span className={styles.dt}>Téléphone</span>
              <div className={styles.dd}>
                {details.phoneDisplay || <span className={styles.muted}>Non renseigné</span>}
              </div>
            </div>
            <div className={styles.row}>
              <span className={styles.dt}>Date de naissance</span>
              <div className={styles.dd}>
                <label className={styles.field}>
                  <span className={styles.srOnly}>Date de naissance</span>
                  <input
                    className={styles.input}
                    inputMode="numeric"
                    placeholder="JJ/MM/AAAA"
                    value={formatBirthInputDisplay(editBirthDigits)}
                    onChange={(e) => setEditBirthDigits(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    disabled={pending}
                  />
                </label>
              </div>
            </div>
            <div className={styles.row}>
              <span className={styles.dt}>Mot de passe</span>
              <div className={styles.dd}>••••••••</div>
            </div>
            <div className={styles.editActions}>
              <button
                type="button"
                className={styles.outlineBtn}
                disabled={pending}
                onClick={() => void saveEdit()}
              >
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" className={styles.ghostBtn} disabled={pending} onClick={cancelEdit}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <>
            <dl className={styles.dl}>
              <div className={styles.row}>
                <dt className={styles.dt}>Prénom</dt>
                <dd className={styles.dd}>
                  {details.firstName || <span className={styles.muted}>—</span>}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.dt}>Nom</dt>
                <dd className={styles.dd}>
                  {details.lastName || <span className={styles.muted}>—</span>}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.dt}>Adresse e-mail</dt>
                <dd className={styles.dd}>
                  {details.email || <span className={styles.muted}>—</span>}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.dt}>Téléphone</dt>
                <dd className={styles.dd}>
                  {details.phoneDisplay ? (
                    <span className={styles.ddWithAction}>
                      <span>{details.phoneDisplay}</span>
                      <button
                        type="button"
                        className={styles.inlineAction}
                        disabled={pending}
                        onClick={openAddPhoneModal}
                      >
                        Changer de téléphone
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.phoneEmptyBtn}
                      disabled={pending}
                      onClick={openAddPhoneModal}
                    >
                      Ajouter un numéro
                    </button>
                  )}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.dt}>Date de naissance</dt>
                <dd className={styles.dd}>
                  {details.birthDateIso ? (
                    formatBirthIsoDisplay(details.birthDateIso)
                  ) : (
                    <span className={styles.muted}>Non renseignée</span>
                  )}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.dt}>Mot de passe</dt>
                <dd className={styles.dd}>
                  <button
                    type="button"
                    className={styles.passwordLink}
                    disabled={pending || !details.email}
                    onClick={() => void sendPasswordResetLink()}
                  >
                    Changer de Mot de Passe
                  </button>
                </dd>
              </div>
            </dl>
            <div className={styles.editActions}>
              <button type="button" className={styles.outlineBtn} disabled={pending} onClick={startEdit}>
                Modifier
              </button>
            </div>
          </>
        )}

        {feedback ? (
          <p
            className={`${styles.feedback} ${feedback.kind === 'ok' ? styles.feedbackOk : styles.feedbackErr}`}
          >
            {feedback.text}
          </p>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="details-delete">
        <h2 id="details-delete" className={styles.sectionTitle}>
          Supprimer mon compte
        </h2>
        <p className={styles.sectionLead}>
          Tu peux demander la suppression de ton compte et de tes données à tout moment. Consulte
          notre{' '}
          <Link href={PRIVACY_HREF} className={styles.privacyLink}>
            Politique de confidentialité
          </Link>
          .
        </p>
        <button
          type="button"
          className={styles.outlineBtn}
          disabled={pending}
          onClick={() => void requestDelete()}
        >
          {pending ? 'Envoi…' : 'Demande de suppression'}
        </button>
      </section>

      {phoneInputModal}
      {phoneOtpModal}
      </div>
    </AccountSectionShell>
  )
}

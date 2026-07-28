'use client'

import {
  sendCheckoutPhoneOtp,
  verifyCheckoutPhoneOtp,
} from '@/lib/auth/checkout-phone'
import {formatFrenchPhoneDisplay, normalizeFrenchLocalNumber, normalizeFrenchPhoneToE164} from '@/lib/phone/fr-mobile'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useCallback, useEffect, useId, useRef, useState, type FormEvent} from 'react'
import {createPortal} from 'react-dom'
import styles from '@/components/auth/checkoutSignupOnboardingModal.module.css'

const OTP_LENGTH = 6
const RESEND_SECONDS = 30

type Props = {
  open: boolean
  initialPhoneE164: string
  onClose: () => void
  onVerified: () => void
}

export function CheckoutPhoneVerifyModal({open, initialPhoneE164, onClose, onVerified}: Props) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const [resendRemaining, setResendRemaining] = useState(0)
  const [phoneLocal, setPhoneLocal] = useState('')
  const [editingPhone, setEditingPhone] = useState(false)
  const sentForRef = useRef<string | null>(null)

  const phoneE164 =
    normalizeFrenchPhoneToE164(phoneLocal) ?? normalizeFrenchPhoneToE164(initialPhoneE164)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const local = normalizeFrenchLocalNumber(initialPhoneE164.replace(/^\+33/, '0'))
    setPhoneLocal(local)
    setEditingPhone(false)
    setOtp('')
    setError(null)
    setStatus(null)
    setPending(false)
    setResendRemaining(0)
    sentForRef.current = null
  }, [open, initialPhoneE164])

  const sendOtp = useCallback(async (force = false) => {
    if (!phoneE164) {
      setError('Saisis un numéro de mobile français valide.')
      return false
    }
    if (!force && sentForRef.current === phoneE164 && resendRemaining > 0) return true

    setPending(true)
    setError(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const result = await sendCheckoutPhoneOtp(supabase, phoneE164)
      if (!result.ok) {
        setError(result.message)
        return false
      }
      sentForRef.current = result.e164
      setStatus('Code envoyé par SMS. Vérifie ton téléphone.')
      setResendRemaining(RESEND_SECONDS)
      setEditingPhone(false)
      return true
    } catch {
      setError("Impossible d'envoyer le code SMS.")
      return false
    } finally {
      setPending(false)
    }
  }, [phoneE164, resendRemaining])

  useEffect(() => {
    if (!open || !phoneE164 || sentForRef.current === phoneE164) return
    void sendOtp(true)
  }, [open, phoneE164, sendOtp])

  useEffect(() => {
    if (!open || resendRemaining <= 0) return
    const id = window.setInterval(() => {
      setResendRemaining((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [open, resendRemaining])

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

  const otpChars = Array.from({length: OTP_LENGTH}, (_, i) => otp[i] ?? '')

  const setOtpDigit = (index: number, digit: string) => {
    const next = otpChars.slice()
    next[index] = digit
    setOtp(next.join(''))
  }

  const handleVerify = async (e?: FormEvent) => {
    e?.preventDefault()
    if (pending || otp.replace(/\D/g, '').length !== OTP_LENGTH || !phoneE164) return
    setPending(true)
    setError(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const result = await verifyCheckoutPhoneOtp(supabase, phoneE164, otp)
      if (!result.ok) {
        setError(result.message)
        setPending(false)
        return
      }
      setPending(false)
      onVerified()
    } catch {
      setError('Vérification impossible.')
      setPending(false)
    }
  }

  if (!open || !mounted) return null

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
        onClick={(ev) => ev.stopPropagation()}
      >
        <button type="button" className={styles.closeBtn} aria-label="Fermer" disabled={pending} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Confirme ton numéro
          </h2>
          <p className={styles.subtitle}>
            On t’envoie un code par SMS avant d’activer ton abonnement. C’est à cette étape que le
            numéro est réservé à ton compte.
          </p>
        </div>

        <div className={styles.body}>
          {editingPhone ? (
            <form
              id="checkout-phone-verify-form"
              onSubmit={(ev) => {
                ev.preventDefault()
                void sendOtp(true)
              }}
              noValidate
            >
              <div className={styles.framedStack}>
                <div className={styles.framedInput}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="Numéro de téléphone"
                    maxLength={10}
                    value={phoneLocal}
                    disabled={pending}
                    onChange={(e) => {
                      setError(null)
                      setPhoneLocal(e.target.value.replace(/\D/g, '').slice(0, 10))
                    }}
                  />
                </div>
              </div>
            </form>
          ) : (
            <form id="checkout-phone-verify-form" onSubmit={(ev) => void handleVerify(ev)} noValidate>
              <p className={styles.otpHint}>
                Code à {OTP_LENGTH} chiffres envoyé au{' '}
                <strong>{formatFrenchPhoneDisplay(phoneE164) || '—'}</strong>.{' '}
                <button
                  type="button"
                  className={styles.resendBtn}
                  disabled={pending}
                  onClick={() => setEditingPhone(true)}
                >
                  Modifier
                </button>
              </p>
              <div className={styles.field}>
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
                        setError(null)
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
              </div>
              <button
                type="button"
                className={styles.resendBtn}
                disabled={pending || resendRemaining > 0}
                onClick={() => void sendOtp(true)}
              >
                {resendRemaining > 0 ? `Renvoyer dans ${resendRemaining}s` : 'Renvoyer le code'}
              </button>
            </form>
          )}

          {error ? <p className={styles.error}>{error}</p> : null}
          {status && !error ? <p className={styles.status}>{status}</p> : null}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.backBtn} disabled={pending} onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            form="checkout-phone-verify-form"
            className={styles.nextBtn}
            disabled={
              pending ||
              (editingPhone
                ? normalizeFrenchLocalNumber(phoneLocal).length !== 9
                : otp.replace(/\D/g, '').length !== OTP_LENGTH)
            }
          >
            {pending ? '…' : editingPhone ? 'Envoyer le code' : 'Confirmer et continuer'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}

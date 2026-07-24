'use client'

import {CheckoutAuthPanel} from '@/components/auth/CheckoutAuthPanel'
import {useEffect, useState} from 'react'
import {createPortal} from 'react-dom'
import styles from './checkoutAuthModal.module.css'

type Props = {
  open: boolean
  onClose: () => void
  /** Après auth réussie (reste sur le website) — connexion existante / Google. */
  onAuthenticated: () => void
  /** Après envoi OTP e-mail → modale code (signup = onboarding, signin = connexion seule). */
  onStartEmailOnboarding: (
    email: string,
    intent?: 'signup' | 'signin',
    step?: 1 | 2 | 3 | 4,
  ) => void
  /** Chemin de retour OAuth, ex. `/catalogue/piece/uuid?checkout=1`. */
  returnPath: string
  initialAuthError?: string | null
}

export function CheckoutAuthModal({
  open,
  onClose,
  onAuthenticated,
  onStartEmailOnboarding,
  returnPath,
  initialAuthError = null,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [pendingGuard, setPendingGuard] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setPendingGuard(false)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pendingGuard) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, pendingGuard])

  if (!open || !mounted) return null

  const dialog = (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={() => {
        if (!pendingGuard) onClose()
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Authentification"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Fermer"
          onClick={onClose}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <CheckoutAuthPanel
          variant="modal"
          returnPath={returnPath}
          initialAuthError={initialAuthError}
          onCancel={onClose}
          onAuthenticated={() => {
            setPendingGuard(false)
            onAuthenticated()
          }}
          onStartEmailOnboarding={(email, intent) => {
            setPendingGuard(false)
            onStartEmailOnboarding(email, intent)
          }}
        />
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}

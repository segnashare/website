'use client'

import Link from 'next/link'
import {useEffect} from 'react'
import {createPortal} from 'react-dom'
import {WEBSITE_CART_PATH} from '@/lib/cart/paths'
import styles from './addToCartModal.module.css'

type Props = {
  open: boolean
  itemTitle: string
  onClose: () => void
  onContinueShopping: () => void
}

export function AddToCartModal({open, itemTitle, onClose, onContinueShopping}: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal
        aria-labelledby="add-to-cart-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} aria-label="Fermer" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
        <p className={styles.eyebrow}>Ajouté au panier</p>
        <h2 id="add-to-cart-title" className={styles.title}>
          {itemTitle}
        </h2>
        <p className={styles.body}>
          Continue à explorer le catalogue, ou finalise ta commande depuis le panier.
        </p>
        <div className={styles.actions}>
          <Link href={WEBSITE_CART_PATH} className={styles.primary} onClick={onClose}>
            Voir mon panier
          </Link>
          <button type="button" className={styles.secondary} onClick={onContinueShopping}>
            Continuer mes achats
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

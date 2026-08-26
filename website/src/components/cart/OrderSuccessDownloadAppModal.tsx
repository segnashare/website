'use client'

import {buildAppHandoffUrl} from '@/lib/auth/build-app-handoff-url'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {
  openIosAppOrAppStore,
  SEGNA_APP_BASE_URL,
  SEGNA_APP_STORE_URL,
} from '@/lib/catalog/catalog-app-links'
import {detectClientPlatform} from '@/lib/platform/client-platform'
import {useCallback, useEffect, useState} from 'react'
import {createPortal} from 'react-dom'
import styles from './orderSuccessDownloadAppModal.module.css'

type Props = {
  open: boolean
  onClose: () => void
  /** Chemin app après handoff (ex. commande). */
  appNextPath?: string
}

export function OrderSuccessDownloadAppModal({
  open,
  onClose,
  appNextPath = '/profile',
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const downloadApp = useCallback(async () => {
    if (pending) return
    setPending(true)
    try {
      const appUrl = await buildAppHandoffUrl(appNextPath, 'website_purchase_success')
      trackWebsiteEvent('cta_clicked', {
        cta_label: 'Télécharger l’app',
        cta_href: appUrl || SEGNA_APP_STORE_URL || SEGNA_APP_BASE_URL,
        placement: 'purchase_success_download_app_modal',
      })
      trackWebsiteEvent('app_open_intent', {
        destination: SEGNA_APP_STORE_URL ? 'app_store' : 'app_handoff',
        href: appUrl || SEGNA_APP_STORE_URL || SEGNA_APP_BASE_URL,
        placement: 'purchase_success_download_app_modal',
      })
      if (detectClientPlatform() === 'ios' && SEGNA_APP_STORE_URL) {
        openIosAppOrAppStore(appUrl, SEGNA_APP_STORE_URL)
        return
      }
      if (SEGNA_APP_STORE_URL) {
        window.open(SEGNA_APP_STORE_URL, '_blank', 'noopener,noreferrer')
        return
      }
      window.location.assign(appUrl || `${SEGNA_APP_BASE_URL}${appNextPath}`)
    } catch {
      window.location.assign(SEGNA_APP_STORE_URL || SEGNA_APP_BASE_URL)
    } finally {
      setPending(false)
    }
  }, [appNextPath, pending])

  if (!open || !mounted) return null

  return createPortal(
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
        aria-labelledby="order-success-app-title"
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

        <div className={styles.card}>
          <h2 id="order-success-app-title" className={styles.title}>
            Suis ta commande sur l’app
          </h2>
          <p className={styles.lead}>
            Télécharge Segna pour recevoir les notifications de suivi et gérer ta commande plus
            facilement.
          </p>
          <button
            type="button"
            className={styles.downloadBtn}
            disabled={pending}
            onClick={() => void downloadApp()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/app-store-badge.png"
              alt="Download on the App Store"
              className={styles.badge}
              width={180}
              height={52}
              decoding="async"
            />
          </button>
        </div>

        <button type="button" className={styles.secondary} disabled={pending} onClick={onClose}>
          Continuer sur le site
        </button>
      </div>
    </div>,
    document.body,
  )
}

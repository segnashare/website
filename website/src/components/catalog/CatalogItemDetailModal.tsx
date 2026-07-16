'use client'

import {CatalogItemDetailView} from '@/components/catalog/CatalogItemDetailView'
import {CatalogRingDotSpinner} from '@/components/catalog/CatalogRingDotSpinner'
import {catalogItemPagePath} from '@/lib/catalog/catalog-app-links'
import type {CatalogItemDetailPayload} from '@/lib/catalog/catalog-item-detail'
import {fetchCatalogItemDetailClient} from '@/lib/catalog/catalog-item-detail-client-fetch'
import {usePathname} from 'next/navigation'
import {useCallback, useEffect, useState} from 'react'
import {createPortal} from 'react-dom'
import styles from './catalogItemDetailModal.module.css'

type CatalogItemDetailModalProps = {
  itemId: string | null
  onClose: () => void
}

export function CatalogItemDetailModal({itemId, onClose}: CatalogItemDetailModalProps) {
  const pathname = usePathname()
  const [detail, setDetail] = useState<CatalogItemDetailPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)
  /** Overlay plein écran hors modale — évite de rester coincé si la nav soft est lente. */
  const [pageNavPending, setPageNavPending] = useState(false)

  const close = useCallback(() => {
    onClose()
  }, [onClose])

  const openDedicatedPage = useCallback(() => {
    if (!itemId || pageNavPending) return
    const path = catalogItemPagePath(itemId)
    setPageNavPending(true)
    // Navigation pleine page : le soft `router.push` était annulé (fermeture modale /
    // `history.replaceState` du browse catalogue).
    window.location.assign(path)
  }, [itemId, pageNavPending])

  useEffect(() => {
    setMounted(true)
  }, [])

  /** Nettoie l’overlay dès qu’on a quitté le catalogue (ou au démontage). */
  useEffect(() => {
    if (!pageNavPending) return
    if (pathname?.startsWith('/catalogue/piece/')) {
      setPageNavPending(false)
      return
    }
    const timeout = window.setTimeout(() => setPageNavPending(false), 10000)
    return () => window.clearTimeout(timeout)
  }, [pathname, pageNavPending])

  useEffect(() => {
    if (!itemId) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [itemId])

  useEffect(() => {
    if (!itemId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [itemId, close])

  useEffect(() => {
    if (!itemId) {
      setDetail(null)
      setError(false)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(false)
    setDetail(null)

    void fetchCatalogItemDetailClient(itemId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [itemId])

  const navOverlay =
    mounted && pageNavPending
      ? createPortal(
          <div className={styles.pageNavOverlay} role="status" aria-live="polite">
            <CatalogRingDotSpinner aria-label="Ouverture de la page" />
          </div>,
          document.body,
        )
      : null

  if (!mounted) return null

  if (!itemId) {
    return navOverlay
  }

  return (
    <>
      {createPortal(
        <div className={styles.backdrop} role="presentation" onClick={close}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal
            aria-label={loading || error || !detail ? 'Détail de la pièce' : undefined}
            aria-labelledby={!loading && !error && detail ? 'catalog-item-modal-title' : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.topActions}>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Ouvrir la page de la pièce"
                onClick={openDedicatedPage}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className={styles.iconBtn} aria-label="Fermer" onClick={close}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <CatalogRingDotSpinner aria-label="Chargement de la pièce" />
              </div>
            ) : null}
            {!loading && error ? (
              <p className={styles.error}>Impossible d&apos;afficher cette pièce pour le moment.</p>
            ) : null}
            {!loading && !error && detail ? (
              <CatalogItemDetailView detail={detail} titleId="catalog-item-modal-title" layout="modal" />
            ) : null}
          </div>
        </div>,
        document.body,
      )}
      {navOverlay}
    </>
  )
}

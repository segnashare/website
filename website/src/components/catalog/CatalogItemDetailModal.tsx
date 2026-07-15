'use client'

import {CatalogItemDetailView} from '@/components/catalog/CatalogItemDetailView'
import {CatalogRingDotSpinner} from '@/components/catalog/CatalogRingDotSpinner'
import {catalogItemPagePath} from '@/lib/catalog/catalog-app-links'
import type {CatalogItemDetailPayload} from '@/lib/catalog/catalog-item-detail'
import {fetchCatalogItemDetailClient} from '@/lib/catalog/catalog-item-detail-client-fetch'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useState} from 'react'
import styles from './catalogItemDetailModal.module.css'

type CatalogItemDetailModalProps = {
  itemId: string | null
  onClose: () => void
}

export function CatalogItemDetailModal({itemId, onClose}: CatalogItemDetailModalProps) {
  const router = useRouter()
  const [detail, setDetail] = useState<CatalogItemDetailPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const close = useCallback(() => {
    onClose()
  }, [onClose])

  const openDedicatedPage = useCallback(() => {
    if (!itemId) return
    const path = catalogItemPagePath(itemId)
    router.push(path)
    close()
  }, [itemId, router, close])

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

  if (!itemId) return null

  return (
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
    </div>
  )
}

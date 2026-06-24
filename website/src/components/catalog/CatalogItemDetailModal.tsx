'use client'

import {CatalogItemPhotoCover} from '@/components/catalog/CatalogItemPhotoCover'
import {formatCatalogBorrowPriceLabel} from '@/lib/catalog/catalog-borrow-price-label'
import type {CatalogItemDetailPayload} from '@/lib/catalog/catalog-item-detail'
import {fetchCatalogItemDetailClient} from '@/lib/catalog/catalog-item-detail-client-fetch'
import {useCallback, useEffect, useState} from 'react'
import styles from './catalogItemDetailModal.module.css'

type CatalogItemDetailModalProps = {
  itemId: string | null
  onClose: () => void
}

function DetailMeta({label, value}: {label: string; value: string | null | undefined}) {
  if (!value?.trim()) return null
  return (
    <li className={styles.metaItem}>
      <span className={styles.metaKey}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </li>
  )
}

function DetailContent({detail}: {detail: CatalogItemDetailPayload}) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const slots = detail.gallery
  const active = slots[photoIndex] ?? slots[0]
  const sizeLine = [detail.size_label, detail.size_code].filter(Boolean).join(' · ') || null

  useEffect(() => {
    setPhotoIndex(0)
  }, [detail.id])

  return (
    <div className={styles.body}>
      <div className={styles.galleryCol}>
        {active ? (
          <div className={styles.hero}>
            <CatalogItemPhotoCover imageUrl={active.url} position={active.position} />
          </div>
        ) : null}
        {slots.length > 1 ? (
          <div className={styles.thumbs} aria-label="Photos de la pièce">
            {slots.map((slot, i) => (
              <button
                key={`${slot.url}-${i}`}
                type="button"
                className={`${styles.thumb} ${i === photoIndex ? styles.thumbActive : ''}`}
                aria-label={`Photo ${i + 1}`}
                aria-current={i === photoIndex ? 'true' : undefined}
                onClick={() => setPhotoIndex(i)}
              >
                <CatalogItemPhotoCover imageUrl={slot.url} position={slot.position} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.infoCol}>
        {detail.brand_label ? <span className={styles.brand}>{detail.brand_label}</span> : null}
        <h2 className={styles.title} id="catalog-item-modal-title">
          {detail.title}
        </h2>
        <p className={styles.price}>{formatCatalogBorrowPriceLabel(detail.price_points)}</p>

        {sizeLine ? (
          <div className={styles.sizeBlock}>
            <span className={styles.sizeLabel}>Taille</span>
            <span className={styles.sizeValue}>{sizeLine}</span>
          </div>
        ) : null}

        <ul className={styles.metaList}>
          <DetailMeta label="Catégorie" value={detail.category_label} />
          <DetailMeta label="Couleur" value={detail.color_label} />
          <DetailMeta label="Matières" value={detail.materials_label} />
          <DetailMeta label="État" value={detail.condition_label} />
        </ul>

        {detail.description?.trim() ? <p className={styles.description}>{detail.description.trim()}</p> : null}
      </div>
    </div>
  )
}

export function CatalogItemDetailModal({itemId, onClose}: CatalogItemDetailModalProps) {
  const [detail, setDetail] = useState<CatalogItemDetailPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const close = useCallback(() => {
    onClose()
  }, [onClose])

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
        <button type="button" className={styles.close} aria-label="Fermer" onClick={close}>
          ×
        </button>

        {loading ? <p className={styles.loading}>Chargement…</p> : null}
        {!loading && error ? (
          <p className={styles.error}>Impossible d&apos;afficher cette pièce pour le moment.</p>
        ) : null}
        {!loading && !error && detail ? <DetailContent detail={detail} /> : null}
      </div>
    </div>
  )
}

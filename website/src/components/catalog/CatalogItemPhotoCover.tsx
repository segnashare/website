'use client'

import type {CSSProperties} from 'react'
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'

import {backgroundStyleCmsPhotoEditorMatch} from '@/lib/cms/cms-editor-photo-style'
import type {ItemPhotoCoverPosition} from '@/lib/items/item-photo-frame'
import {isDefaultItemPhotoPosition} from '@/lib/items/item-photo-frame'

import styles from './catalogItemPhotoCover.module.css'

type CatalogItemPhotoCoverProps = {
  imageUrl: string
  position?: ItemPhotoCoverPosition | null
  className?: string
  /** Recadrage simple si pas de cadrage BO (ex. hotspot Sanity). */
  objectPosition?: string
  /**
   * Ignore le cadrage BO et centre l’image (`background-size: cover`).
   * Utile pour les grands cadres (modal) où le crop catalogue affiche surtout le haut.
   */
  centerCover?: boolean
}

/**
 * Couverture catalogue : même moteur que le BO (`backgroundStyleCmsPhotoEditorMatch`).
 */
export function CatalogItemPhotoCover({
  imageUrl,
  position,
  className = '',
  objectPosition,
  centerCover = false,
}: CatalogItemPhotoCoverProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [naturalSize, setNaturalSize] = useState<{w: number; h: number} | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [box, setBox] = useState({w: 0, h: 0})

  const pos = position ?? null
  const useBoCrop = !centerCover && Boolean(pos && !isDefaultItemPhotoPosition(pos))

  useEffect(() => {
    let cancelled = false
    setNaturalSize(null)
    setLoadFailed(false)
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setNaturalSize({w: img.naturalWidth, h: img.naturalHeight})
      }
    }
    img.onerror = () => {
      if (!cancelled) setLoadFailed(true)
    }
    img.src = imageUrl
    return () => {
      cancelled = true
    }
  }, [imageUrl])

  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      setBox((prev) => (prev.w === w && prev.h === h ? prev : {w, h}))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [imageUrl])

  const fillStyle = useMemo((): CSSProperties | null => {
    if (!useBoCrop || !pos || !naturalSize || box.w <= 0 || box.h <= 0) return null
    return (
      backgroundStyleCmsPhotoEditorMatch({
        photoUrl: imageUrl,
        naturalWidth: naturalSize.w,
        naturalHeight: naturalSize.h,
        containerWidth: box.w,
        containerHeight: box.h,
        zoom: pos.zoom,
        offsetX: pos.offset.x,
        offsetY: pos.offset.y,
      }) ?? null
    )
  }, [useBoCrop, pos, naturalSize, box.w, box.h, imageUrl])

  const simpleCoverStyle: CSSProperties = {
    backgroundImage: `url(${imageUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    backgroundPosition: objectPosition ?? 'center center',
  }

  const frameClass = [styles.frame, className].filter(Boolean).join(' ')

  /* Chemin dédié modal / lightbox : <img> cover centré, sans moteur BO. */
  if (centerCover) {
    return (
      <div ref={frameRef} className={frameClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className={styles.fallbackImg}
          style={{objectFit: 'cover', objectPosition: objectPosition ?? 'center center'}}
        />
      </div>
    )
  }

  return (
    <div ref={frameRef} className={frameClass}>
      {loadFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className={styles.fallbackImg}
          style={{objectPosition: objectPosition ?? 'center center'}}
        />
      ) : fillStyle ? (
        <div className={styles.fill} style={fillStyle} aria-hidden />
      ) : naturalSize ? (
        <div className={styles.fill} style={simpleCoverStyle} aria-hidden />
      ) : (
        <div className={styles.skeleton} aria-hidden />
      )}
    </div>
  )
}

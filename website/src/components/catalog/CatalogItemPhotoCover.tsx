'use client'

import NextImage from 'next/image'
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
   * Ignore le cadrage BO et centre l’image (`object-fit: cover`).
   * Utile pour les grands cadres (modal) où le crop catalogue affiche surtout le haut.
   */
  centerCover?: boolean
  /** `next/image` sizes — défaut carte catalogue. */
  sizes?: string
  /** Priorité LCP (premières cartes / hero). */
  priority?: boolean
}

function canUseNextImage(url: string): boolean {
  if (!url || url.startsWith('data:')) return false
  try {
    const u = new URL(url, typeof window === 'undefined' ? 'https://segnashare.com' : window.location.origin)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Couverture catalogue : paint immédiat + `next/image` (resize Vercel) hors crop BO.
 * Crop BO : image cover d’abord, puis moteur `backgroundStyleCmsPhotoEditorMatch`.
 */
export function CatalogItemPhotoCover({
  imageUrl,
  position,
  className = '',
  objectPosition,
  centerCover = false,
  sizes = '(max-width: 768px) 50vw, 280px',
  priority = false,
}: CatalogItemPhotoCoverProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [naturalSize, setNaturalSize] = useState<{w: number; h: number} | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [painted, setPainted] = useState(false)
  const [box, setBox] = useState({w: 0, h: 0})

  const pos = position ?? null
  const useBoCrop = !centerCover && Boolean(pos && !isDefaultItemPhotoPosition(pos))
  const useOptimizer = !useBoCrop && canUseNextImage(imageUrl)

  useEffect(() => {
    setNaturalSize(null)
    setLoadFailed(false)
    setPainted(false)
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

  // Dimensions pour le crop BO uniquement (pas de blocage du paint).
  useEffect(() => {
    if (!useBoCrop || !imageUrl) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setNaturalSize({w: img.naturalWidth, h: img.naturalHeight})
        setPainted(true)
      }
    }
    img.onerror = () => {
      if (!cancelled) setLoadFailed(true)
    }
    img.src = imageUrl
    return () => {
      cancelled = true
    }
  }, [imageUrl, useBoCrop])

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

  const frameClass = [styles.frame, className].filter(Boolean).join(' ')
  const objectPos = objectPosition ?? 'center center'
  const showSkeleton = !painted && !loadFailed && !fillStyle

  const onImgReady = (w?: number, h?: number) => {
    setPainted(true)
    if (w && h && w > 0 && h > 0) setNaturalSize({w, h})
  }

  return (
    <div ref={frameRef} className={frameClass}>
      {fillStyle ? (
        <div className={styles.fill} style={fillStyle} aria-hidden />
      ) : useOptimizer ? (
        <NextImage
          src={imageUrl}
          alt=""
          fill
          sizes={sizes}
          quality={75}
          priority={priority}
          className={styles.nextImg}
          style={{objectFit: 'cover', objectPosition: objectPos}}
          onLoad={(e) => {
            const img = e.currentTarget
            onImgReady(img.naturalWidth, img.naturalHeight)
          }}
          onError={() => setLoadFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className={styles.fallbackImg}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          style={{objectFit: 'cover', objectPosition: objectPos}}
          onLoad={(e) => {
            const img = e.currentTarget
            onImgReady(img.naturalWidth, img.naturalHeight)
          }}
          onError={() => setLoadFailed(true)}
        />
      )}
      {showSkeleton ? <div className={styles.skeleton} aria-hidden /> : null}
    </div>
  )
}

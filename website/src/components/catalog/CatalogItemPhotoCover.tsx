'use client'

import NextImage from 'next/image'
import type {CSSProperties} from 'react'
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'

import {backgroundStyleCmsPhotoEditorMatch} from '@/lib/cms/cms-editor-photo-style'
import type {ItemPhotoCoverPosition} from '@/lib/items/item-photo-frame'
import {isDefaultItemPhotoPosition} from '@/lib/items/item-photo-frame'

import styles from './catalogItemPhotoCover.module.css'

/** Largeurs autorisées par `next.config` images.imageSizes / deviceSizes. */
const DEFAULT_OPTIMIZED_WIDTH = 384

type CatalogItemPhotoCoverProps = {
  imageUrl: string | null | undefined
  position?: ItemPhotoCoverPosition | null
  className?: string
  /** Recadrage simple si pas de cadrage BO (ex. hotspot Sanity). */
  objectPosition?: string
  /**
   * Ignore le cadrage BO et centre l’image (`object-fit: cover`).
   * Utile pour les grands cadres (modal) où le crop catalogue affiche surtout le haut.
   */
  centerCover?: boolean
  /** Lightbox plein écran : photo entière, sans crop. */
  objectFit?: 'cover' | 'contain'
  /** `next/image` sizes — défaut carte catalogue. */
  sizes?: string
  /** Priorité LCP (premières cartes / hero). */
  priority?: boolean
  /** `loading=eager` sans forcément `fetchPriority=high` (marquee). */
  eager?: boolean
  /**
   * Clone marquee : fond CSS via `/_next/image` (même URL que la carte réelle → cache navigateur),
   * pas de 2e instance `next/image` / preload full-res.
   */
  decorative?: boolean
  /**
   * Largeur max demandée à `/_next/image` pour crop BO / clone CSS.
   * Doit être dans imageSizes/deviceSizes (défaut 384 = carte).
   */
  optimizedWidth?: number
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

/** Déjà redimensionné côté Supabase Storage — éviter le double hop `/_next/image`. */
function isSupabaseRenderImageUrl(url: string): boolean {
  try {
    return new URL(url).pathname.includes('/storage/v1/render/image/')
  } catch {
    return false
  }
}

/** URL Image Optimization Next — pour CSS background / preload crop BO (URLs non transformées). */
function nextOptimizedSrc(url: string, width: number, quality = 75): string {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`
}

/**
 * Couverture catalogue : paint immédiat + `next/image` (resize Vercel) hors crop BO.
 * Crop BO : image optimisée (`/_next/image` ou URL Storage déjà transformée) + moteur crop.
 * Clone décoratif : fond CSS (évite le double fetch marquee).
 */
export function CatalogItemPhotoCover({
  imageUrl,
  position,
  className = '',
  objectPosition,
  centerCover = false,
  objectFit = 'cover',
  sizes = '(max-width: 768px) 50vw, 280px',
  priority = false,
  eager = false,
  decorative = false,
  optimizedWidth = DEFAULT_OPTIMIZED_WIDTH,
}: CatalogItemPhotoCoverProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [naturalSize, setNaturalSize] = useState<{w: number; h: number} | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [optimizerFailed, setOptimizerFailed] = useState(false)
  const [cropFailed, setCropFailed] = useState(false)
  const [box, setBox] = useState({w: 0, h: 0})
  const mediaRef = useRef<HTMLImageElement | null>(null)

  const src = imageUrl?.trim() ?? ''
  const pos = position ?? null
  const useBoCrop =
    Boolean(src) && !centerCover && !cropFailed && Boolean(pos && !isDefaultItemPhotoPosition(pos))
  const alreadyResized = Boolean(src) && isSupabaseRenderImageUrl(src)
  // Storage transform déjà à ~768/1600px → pas de 2e passage Vercel Image Optimization.
  const useOptimizer =
    Boolean(src) &&
    !decorative &&
    !useBoCrop &&
    !alreadyResized &&
    !optimizerFailed &&
    canUseNextImage(src)
  const paintUrl =
    src && canUseNextImage(src) && (useBoCrop || decorative)
      ? alreadyResized
        ? src
        : nextOptimizedSrc(src, optimizedWidth)
      : src

  useEffect(() => {
    setNaturalSize(null)
    setLoadFailed(false)
    setOptimizerFailed(false)
    setCropFailed(false)
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
  // Charge la variante optimisée — pas le JPEG Storage original.
  useEffect(() => {
    if (!useBoCrop || !paintUrl) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setNaturalSize({w: img.naturalWidth, h: img.naturalHeight})
      }
    }
    img.onerror = () => {
      if (!cancelled) setCropFailed(true)
    }
    img.src = paintUrl
    // Cached / already-complete : `onload` peut ne jamais se relancer.
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalSize({w: img.naturalWidth, h: img.naturalHeight})
    }
    return () => {
      cancelled = true
    }
  }, [paintUrl, useBoCrop])

  const fillStyle = useMemo((): CSSProperties | null => {
    if (decorative && paintUrl) {
      const objectPos = objectPosition ?? 'center center'
      return {
        backgroundImage: `url(${paintUrl})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: objectPos,
        backgroundSize: 'cover',
      }
    }
    if (!useBoCrop || !pos || !naturalSize || box.w <= 0 || box.h <= 0) return null
    return (
      backgroundStyleCmsPhotoEditorMatch({
        photoUrl: paintUrl,
        naturalWidth: naturalSize.w,
        naturalHeight: naturalSize.h,
        containerWidth: box.w,
        containerHeight: box.h,
        zoom: pos.zoom,
        offsetX: pos.offset.x,
        offsetY: pos.offset.y,
      }) ?? null
    )
  }, [decorative, useBoCrop, pos, naturalSize, box.w, box.h, paintUrl, objectPosition])

  const frameClass = [styles.frame, className].filter(Boolean).join(' ')
  const objectPos = objectPosition ?? 'center center'
  const showImage = Boolean(src) && !loadFailed
  const showPlaceholder = !src || loadFailed

  const onImgReady = (w?: number, h?: number) => {
    if (w && h && w > 0 && h > 0) setNaturalSize({w, h})
  }

  useLayoutEffect(() => {
    const img = mediaRef.current
    if (!img || !showImage) return
    if (img.complete && img.naturalWidth > 0) {
      onImgReady(img.naturalWidth, img.naturalHeight)
    }
  }, [showImage, src, useOptimizer, paintUrl])

  const imgClass = [styles.media]

  return (
    <div ref={frameRef} className={frameClass}>
      {showImage && fillStyle ? (
        <div className={styles.fill} style={fillStyle} aria-hidden />
      ) : showImage && useOptimizer ? (
        <NextImage
          src={src}
          alt=""
          fill
          sizes={sizes}
          quality={75}
          // `eager` seul ne suffit pas sur next/image (lazy par défaut) — bloqué sous marquee transform.
          priority={priority || eager}
          ref={mediaRef}
          className={[styles.nextImg, ...imgClass].filter(Boolean).join(' ')}
          style={{objectFit, objectPosition: objectPos}}
          onLoad={(e) => {
            const img = e.currentTarget
            onImgReady(img.naturalWidth, img.naturalHeight)
          }}
          onError={() => setOptimizerFailed(true)}
        />
      ) : showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={mediaRef}
          src={src}
          alt=""
          className={[styles.fallbackImg, ...imgClass].filter(Boolean).join(' ')}
          decoding="async"
          loading={priority || eager ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          style={{objectFit, objectPosition: objectPos}}
          onLoad={(e) => {
            const img = e.currentTarget
            onImgReady(img.naturalWidth, img.naturalHeight)
          }}
          onError={() => setLoadFailed(true)}
        />
      ) : null}
      {showPlaceholder ? <div className={styles.placeholder} aria-hidden /> : null}
    </div>
  )
}

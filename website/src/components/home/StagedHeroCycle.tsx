'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import Image from 'next/image'
import {AnimatePresence, motion} from 'framer-motion'
import type {HomeHeroStagedState} from '@/lib/sanity'
import {
  objectPositionFromHotspot,
  resolveStagedImageObjectFit,
  resolveStagedImageSlotStyle,
} from '@/lib/homeStagedPlacements'
import {stagedHeroImageSizes, stagedHeroSliceImageSizes, urlForStagedHeroImage} from '@/lib/sanity'
import heroStyles from './homeHero.module.css'
import staged from './homeStagedHero.module.css'
import {useHydrationSafeReducedMotion} from './useHydrationSafeReducedMotion'

function stagedImageHasAsset(img: {image?: {asset?: {url?: string; _ref?: string; _id?: string}}}): boolean {
  const a = img.image?.asset
  if (!a) return false
  return Boolean(a._ref || a._id || a.url)
}

function normalizeStagedBg(raw?: string | null) {
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim()
  return '#2d3748'
}

function countStagedImages(st?: HomeHeroStagedState | undefined) {
  const n = (st?.images ?? []).filter(stagedImageHasAsset).length
  return n > 0 ? n : 1
}

/** Plus haut = la couleur de fond change plus tard dans la transition (images d’abord). */
const STAGED_BG_SWAP_BIAS = 0.88

function stagedSwapMidpointDelaySec(opts: {
  transitionMs: number
  prevState: HomeHeroStagedState | undefined
  nextState: HomeHeroStagedState | undefined
}) {
  const {transitionMs, prevState, nextState} = opts
  const tSec = Math.max(0.2, Math.min(2.5, transitionMs / 1000))
  const durIn = tSec * 1.05
  const durOut = tSec * 1.02
  const nOld = countStagedImages(prevState)
  const nNew = countStagedImages(nextState)
  const exitTotal = durOut + Math.max(0, nOld - 1) * 0.06
  const enterTotal = durIn + Math.max(0, nNew - 1) * 0.07 + 0.02
  return ((exitTotal + enterTotal) / 2) * STAGED_BG_SWAP_BIAS
}

export type StagedHeroCycleProps = {
  states: HomeHeroStagedState[]
  transitionMs: number
  /** `hero` : calque plein écran (page d’accueil). `slice` : parent dimensionné (tranche 1/3). */
  layout?: 'hero' | 'slice'
  /** Valeur `sizes` pour next/image ; en tranche, une valeur plus étroite limite le poids. */
  sizes?: string
  /** Classes CSS additionnelles sur la racine (ex. coins arrondis dans un bloc mobile). */
  className?: string
}

export function StagedHeroCycle({
  states,
  transitionMs,
  layout = 'hero',
  sizes,
  className,
}: StagedHeroCycleProps) {
  const [index, setIndex] = useState(0)
  const [bgDisplay, setBgDisplay] = useState(() => normalizeStagedBg(states[0]?.backgroundColor))
  const [isNarrow, setIsNarrow] = useState(false)
  const prevIndexRef = useRef(0)
  const indexRef = useRef(0)
  const statesRef = useRef<HomeHeroStagedState[]>([])
  const reduce = useHydrationSafeReducedMotion()
  const safeStates = states.length > 0 ? states : []
  indexRef.current = index
  statesRef.current = safeStates
  const state = safeStates[index] ?? safeStates[0]
  const tSec = Math.max(0.2, Math.min(2.5, transitionMs / 1000))
  const imageSizes = sizes ?? (layout === 'slice' ? stagedHeroSliceImageSizes : stagedHeroImageSizes)

  const {containerVariants, itemVariants} = useMemo(() => {
    const enterY = '108vh'
    const exitY = '-108vh'
    const durIn = tSec * 1.05
    const durOut = tSec * 1.02
    const easeIn = [0.22, 1, 0.36, 1] as const
    const easeOut = [0.42, 0, 0.2, 1] as const
    return {
      containerVariants: {
        incoming: {},
        visible: {
          transition: {staggerChildren: 0.07, delayChildren: 0.02},
        },
        exitGroup: {
          transition: {staggerChildren: 0.06, staggerDirection: -1 as const},
        },
      },
      itemVariants: {
        incoming: {y: enterY},
        visible: {
          y: 0,
          transition: {duration: durIn, ease: easeIn},
        },
        exitGroup: {
          y: exitY,
          transition: {duration: durOut, ease: easeOut},
        },
      },
    }
  }, [tSec])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1200px)')
    const apply = () => setIsNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (reduce || safeStates.length < 2) return

    /* `window.setTimeout` renvoie un `number` (DOM) ; éviter `ReturnType<typeof setTimeout>` qui peut être `NodeJS.Timeout` côté build Vercel/Node. */
    let advanceId: number | undefined

    const clearAdvance = () => {
      if (advanceId != null) {
        window.clearTimeout(advanceId)
        advanceId = undefined
      }
    }

    const armAdvance = () => {
      clearAdvance()
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      const list = statesRef.current
      const current = list[indexRef.current]
      const ms = current?.durationMs ?? 5000
      advanceId = window.setTimeout(() => {
        setIndex((i) => (i + 1) % statesRef.current.length)
      }, ms)
    }

    armAdvance()

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearAdvance()
        return
      }
      window.setTimeout(() => {
        const list = statesRef.current
        const idx = indexRef.current
        const cur = list[idx]
        if (cur) {
          setBgDisplay(normalizeStagedBg(cur.backgroundColor))
          prevIndexRef.current = idx
        }
      }, 0)
      armAdvance()
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearAdvance()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [index, reduce, safeStates.length, safeStates[index]?.durationMs])

  useEffect(() => {
    const list = statesRef.current
    const st = list[index]
    if (!st) return

    if (reduce || list.length < 2) {
      setBgDisplay(normalizeStagedBg(st.backgroundColor))
      prevIndexRef.current = index
      return
    }

    const oldIdx = prevIndexRef.current
    if (oldIdx === index) return

    const prevState = list[oldIdx]
    const delaySec = stagedSwapMidpointDelaySec({transitionMs, prevState, nextState: st})
    const nextBg = normalizeStagedBg(st.backgroundColor)
    const targetIndex = index
    prevIndexRef.current = index

    const id = window.setTimeout(() => {
      if (indexRef.current !== targetIndex) {
        const cur = statesRef.current[indexRef.current]
        if (cur) {
          setBgDisplay(normalizeStagedBg(cur.backgroundColor))
          prevIndexRef.current = indexRef.current
        }
        return
      }
      setBgDisplay(nextBg)
    }, delaySec * 1000)
    return () => window.clearTimeout(id)
  }, [index, reduce, transitionMs, safeStates.length])

  if (!state) return null

  const images = (state.images ?? []).filter(stagedImageHasAsset)

  const rootClassName = [
    layout === 'slice' ? staged.stagedRoot : `${heroStyles.backgroundLayer} ${staged.stagedRoot}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClassName}>
      <div className={staged.stateBg} style={{backgroundColor: bgDisplay}} />
      <div className={staged.statePlane}>
        {reduce ? (
          images.map((img, i) => {
            const src = urlForStagedHeroImage(img.image!).url()
            const alt = img.alt?.trim() || img.image?.alt || ' '
            const fit = resolveStagedImageObjectFit(img, isNarrow, state, i)
            const objectPosition =
              fit === 'cover' ? objectPositionFromHotspot(img.image?.hotspot) : undefined
            const imgNode = (
              <Image
                src={src}
                alt={alt}
                fill
                sizes={imageSizes}
                quality={85}
                style={{
                  objectFit: fit,
                  ...(objectPosition ? {objectPosition} : {}),
                }}
                priority={index === 0 && i === 0}
              />
            )
            return (
              <div
                key={`${state._key ?? index}-${img._key ?? i}`}
                className={staged.imgSlot}
                style={resolveStagedImageSlotStyle(img, i, isNarrow, state)}
              >
                <div className={staged.imgSlotClip}>{imgNode}</div>
              </div>
            )
          })
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={state._key ?? `state-${index}`}
              className={staged.stateImageGroup}
              variants={containerVariants}
              initial="incoming"
              animate="visible"
              exit="exitGroup"
            >
              {images.map((img, i) => {
                const src = urlForStagedHeroImage(img.image!).url()
                const alt = img.alt?.trim() || img.image?.alt || ' '
                const fit = resolveStagedImageObjectFit(img, isNarrow, state, i)
                const objectPosition =
                  fit === 'cover' ? objectPositionFromHotspot(img.image?.hotspot) : undefined
                const imgNode = (
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes={imageSizes}
                    quality={85}
                    style={{
                      objectFit: fit,
                      ...(objectPosition ? {objectPosition} : {}),
                    }}
                    priority={index === 0 && i === 0}
                  />
                )
                return (
                  <motion.div
                    key={img._key ?? `img-${i}`}
                    className={staged.imgSlot}
                    style={resolveStagedImageSlotStyle(img, i, isNarrow, state)}
                    variants={itemVariants}
                  >
                    <div className={staged.imgSlotClip}>{imgNode}</div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

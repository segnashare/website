'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import Image from 'next/image'
import {AnimatePresence, motion, useReducedMotion} from 'framer-motion'
import type {HomeHeroStagedState} from '@/lib/sanity'
import {
  objectPositionFromHotspot,
  resolveStagedImageObjectFit,
  resolveStagedImageSlotStyle,
} from '@/lib/homeStagedPlacements'
import {stagedHeroImageSizes, stagedHeroSliceImageSizes, urlForStagedHeroImage} from '@/lib/sanity'
import heroStyles from './homeHero.module.css'
import staged from './homeStagedHero.module.css'

function stagedImageHasAsset(img: {image?: {asset?: {url?: string; _ref?: string}}}): boolean {
  const a = img.image?.asset
  if (!a) return false
  return Boolean(a._ref || a.url)
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
}

export function StagedHeroCycle({
  states,
  transitionMs,
  layout = 'hero',
  sizes,
}: StagedHeroCycleProps) {
  const [index, setIndex] = useState(0)
  const [bgDisplay, setBgDisplay] = useState(() => normalizeStagedBg(states[0]?.backgroundColor))
  const [isNarrow, setIsNarrow] = useState(false)
  const prevIndexRef = useRef(0)
  const reduce = useReducedMotion()
  const safeStates = states.length > 0 ? states : []
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
    const mq = window.matchMedia('(max-width: 1024px)')
    const apply = () => setIsNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (reduce || safeStates.length < 2) return
    const current = safeStates[index]
    const ms = current?.durationMs ?? 5000
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % safeStates.length)
    }, ms)
    return () => window.clearTimeout(id)
  }, [index, reduce, safeStates.length, safeStates[index]?.durationMs])

  useEffect(() => {
    const st = safeStates[index]
    if (!st) return

    if (reduce || safeStates.length < 2) {
      setBgDisplay(normalizeStagedBg(st.backgroundColor))
      prevIndexRef.current = index
      return
    }

    const oldIdx = prevIndexRef.current
    if (oldIdx === index) return

    const prevState = safeStates[oldIdx]
    const delaySec = stagedSwapMidpointDelaySec({transitionMs, prevState, nextState: st})
    const nextBg = normalizeStagedBg(st.backgroundColor)
    prevIndexRef.current = index

    const id = window.setTimeout(() => setBgDisplay(nextBg), delaySec * 1000)
    return () => window.clearTimeout(id)
  }, [index, reduce, safeStates, transitionMs])

  if (!state) return null

  const images = (state.images ?? []).filter(stagedImageHasAsset)

  const rootClassName =
    layout === 'slice' ? staged.stagedRoot : `${heroStyles.backgroundLayer} ${staged.stagedRoot}`

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
                quality={96}
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
                    quality={96}
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

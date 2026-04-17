'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import Image from 'next/image'
import {AnimatePresence, motion, useReducedMotion} from 'framer-motion'
import type {
  HomeHeroStagedImage,
  HomeHeroStagedState,
  TriptychCard as TriptychCardData,
  TriptychCardCycleState,
} from '@/lib/sanity'
import {
  objectPositionFromHotspot,
  resolveStagedImageObjectFit,
} from '@/lib/homeStagedPlacements'
import {resolveTriptychImageSlotStyle} from '@/lib/triptychPlacements'
import {PortableRichText} from '@/components/cms/PortableRichText'
import {triptychCardImageSizes, urlFor, urlForStagedHeroImage} from '@/lib/sanity'
import {CtaHrefLink} from '@/components/home/heroShared'
import styles from './triptych.module.css'

function stagedImageHasAsset(img: {image?: {asset?: {url?: string; _ref?: string}}}): boolean {
  const a = img.image?.asset
  if (!a) return false
  return Boolean(a._ref || a.url)
}

function normalizeStagedBg(raw?: string | null) {
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim()
  return '#2d3748'
}

function countCycleImages(st?: TriptychCardCycleState | undefined) {
  const n = (st?.images ?? []).filter(stagedImageHasAsset).length
  return n > 0 ? n : 1
}

/** Aligné sur le hero : bascule du fond un peu avant le milieu de la transition. */
const TRIPTYCH_BG_SWAP_BIAS = 0.2

function triptychSwapMidpointDelaySec(opts: {
  transitionMs: number
  prevState: TriptychCardCycleState | undefined
  nextState: TriptychCardCycleState | undefined
}) {
  const {transitionMs, prevState, nextState} = opts
  const tSec = Math.max(0.2, Math.min(2.5, transitionMs / 1000))
  const durIn = tSec * 1.05
  const durOut = tSec * 1.02
  const nOld = countCycleImages(prevState)
  const nNew = countCycleImages(nextState)
  const exitTotal = durOut + Math.max(0, nOld - 1) * 0.06
  const enterTotal = durIn + Math.max(0, nNew - 1) * 0.07 + 0.02
  return ((exitTotal + enterTotal) / 2) * TRIPTYCH_BG_SWAP_BIAS
}

function toHeroLikeState(st: TriptychCardCycleState): HomeHeroStagedState {
  return {
    _key: st._key,
    label: '',
    backgroundColor: st.backgroundColor,
    durationMs: st.durationMs,
    images: st.images,
    frameLayout: st.frameLayout ?? null,
  }
}

function TriptychCardCycle({
  states,
  transitionMs,
}: {
  states: TriptychCardCycleState[]
  transitionMs: number
}) {
  const [index, setIndex] = useState(0)
  const [bgDisplay, setBgDisplay] = useState(() => normalizeStagedBg(states[0]?.backgroundColor))
  const [isNarrow, setIsNarrow] = useState(false)
  const prevIndexRef = useRef(0)
  const indexRef = useRef(0)
  const statesRef = useRef<TriptychCardCycleState[]>([])
  const reduce = useReducedMotion()
  const safeStates = states.length > 0 ? states : []
  indexRef.current = index
  statesRef.current = safeStates
  const state = safeStates[index] ?? safeStates[0]
  const tSec = Math.max(0.2, Math.min(2.5, transitionMs / 1000))

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
    const delaySec = triptychSwapMidpointDelaySec({transitionMs, prevState, nextState: st})
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
  const heroLike = toHeroLikeState(state)

  const slotInner = (img: HomeHeroStagedImage, i: number) => {
    const src = urlForStagedHeroImage(img.image!).url()
    const alt = img.alt?.trim() || img.image?.alt || ' '
    const fit = resolveStagedImageObjectFit(img, isNarrow, heroLike, i)
    const objectPosition = fit === 'cover' ? objectPositionFromHotspot(img.image?.hotspot) : undefined
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={triptychCardImageSizes}
        quality={90}
        style={{
          objectFit: fit,
          ...(objectPosition ? {objectPosition} : {}),
        }}
        priority={index === 0 && i === 0}
      />
    )
  }

  return (
    <div className={styles.cycleRoot}>
      <div className={styles.cycleBg} style={{backgroundColor: bgDisplay}} />
      <div className={styles.cyclePlane}>
        {reduce ? (
          images.map((img, i) => (
            <div
              key={`${state._key ?? index}-${img._key ?? i}`}
              className={styles.imgSlot}
              style={resolveTriptychImageSlotStyle(img, i, isNarrow, state)}
            >
              <div className={styles.imgSlotClip}>{slotInner(img, i)}</div>
            </div>
          ))
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={state._key ?? `state-${index}`}
              className={styles.stateImageGroup}
              variants={containerVariants}
              initial="incoming"
              animate="visible"
              exit="exitGroup"
            >
              {images.map((img, i) => (
                <motion.div
                  key={img._key ?? `img-${i}`}
                  className={styles.imgSlot}
                  style={resolveTriptychImageSlotStyle(img, i, isNarrow, state)}
                  variants={itemVariants}
                >
                  <div className={styles.imgSlotClip}>{slotInner(img, i)}</div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

type Props = {
  card: TriptychCardData
  transitionMs: number
}

export function TriptychCard({card, transitionMs}: Props) {
  const presentation = card.presentation === 'color_cycle' ? 'color_cycle' : 'static_image'
  const href = card.href?.trim() ?? ''
  const hasLink = Boolean(href)

  const frame = (
    <div className={styles.frameShell}>
      <div className={styles.frameMedia} aria-hidden={presentation === 'color_cycle' ? undefined : true}>
        {presentation === 'static_image' && card.staticImage?.asset ? (
          (() => {
            const fit = card.staticObjectFit === 'contain' ? 'contain' : 'cover'
            const objectPosition =
              fit === 'cover' ? objectPositionFromHotspot(card.staticImage.hotspot) : undefined
            const src = urlFor(card.staticImage).width(900).height(1350).fit('max').auto('format').url()
            return (
              <Image
                src={src}
                alt={card.staticImage.alt?.trim() || ' '}
                fill
                className={styles.staticImg}
                sizes={triptychCardImageSizes}
                style={{
                  objectFit: fit,
                  ...(objectPosition ? {objectPosition} : {}),
                }}
              />
            )
          })()
        ) : presentation === 'color_cycle' && (card.cycleStates?.length ?? 0) > 0 ? (
          <TriptychCardCycle states={card.cycleStates!} transitionMs={transitionMs} />
        ) : null}
      </div>
      <h3 className={styles.frameTitle}>{card.frameTitle}</h3>
    </div>
  )

  const captionBlocks = Array.isArray(card.caption) ? card.caption : null
  const caption =
    captionBlocks && captionBlocks.length > 0 ? (
      <PortableRichText value={captionBlocks} className={styles.captionRich} />
    ) : null

  const body = (
    <div className={styles.cardInner}>
      {frame}
      {caption}
    </div>
  )

  if (hasLink) {
    return (
      <CtaHrefLink href={href} className={styles.cardHit}>
        {body}
      </CtaHrefLink>
    )
  }

  return <div className={styles.cardHit}>{body}</div>
}

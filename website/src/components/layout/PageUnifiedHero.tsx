'use client'

import Image from 'next/image'
import {heroTitlePlainText} from '@/lib/hero-title'
import type {HomeHeroStagedState, SanityImage} from '@/lib/sanity'
import {urlFor} from '@/lib/sanity'
import {CtaHrefLink} from '@/components/home/heroShared'
import {StagedHeroCycle} from '@/components/home/StagedHeroCycle'
import styles from './pageUnifiedHero.module.css'

export type PageUnifiedHeroCta = { label: string; href: string }

export type PageUnifiedHeroProps = {
  title: string
  subtitle?: string | null
  cta?: PageUnifiedHeroCta | null
  /** Même pipeline que le hero d’accueil (couleurs, images, cadres Sanity). */
  stagedStates?: HomeHeroStagedState[] | null
  stagedTransitionMs?: number
  /** Si aucun cycle multi-états : image statique dans la tranche. */
  staticImage?: SanityImage | null
}

function staticImageHasAsset(img?: SanityImage | null) {
  const a = img?.asset
  return Boolean(a?._ref || a?.url)
}

export function PageUnifiedHero({
  title,
  subtitle,
  cta,
  stagedStates,
  stagedTransitionMs = 650,
  staticImage,
}: PageUnifiedHeroProps) {
  const states = stagedStates ?? []
  const useStaged = states.length > 0
  const useStatic = !useStaged && staticImageHasAsset(staticImage)

  const staticSrc =
    useStatic && staticImage
      ? urlFor(staticImage).width(900).height(1200).fit('max').url()
      : null

  return (
    <section className={styles.hero} aria-labelledby="page-unified-hero-title">
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.copy}>
            <h1 id="page-unified-hero-title" className={styles.title}>
              {title}
            </h1>
            {subtitle?.trim() ? <p className={styles.subtitle}>{subtitle.trim()}</p> : null}
            {cta?.label?.trim() ? (
              <CtaHrefLink href={cta.href} className={styles.cta}>
                {cta.label.trim()}
              </CtaHrefLink>
            ) : null}
          </div>

          <div className={styles.sliceCol}>
            <div className={styles.sliceFrame}>
              {useStaged ? (
                <div className={styles.sliceFrameInner}>
                  <StagedHeroCycle
                    states={states}
                    transitionMs={stagedTransitionMs}
                    layout="slice"
                  />
                </div>
              ) : null}

              {useStatic && staticSrc ? (
                <Image
                  className={styles.staticImg}
                  src={staticSrc}
                  alt={staticImage?.alt?.trim() || heroTitlePlainText(title)}
                  fill
                  sizes="(max-width: 1024px) 96vw, 36vw"
                  priority
                />
              ) : null}

              {!useStaged && !useStatic ? <div className={styles.sliceFallback} aria-hidden /> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

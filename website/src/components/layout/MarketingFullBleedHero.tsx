'use client'

import {useMemo, type ReactNode} from 'react'
import Image from 'next/image'
import {motion} from 'framer-motion'
import type {MarketingPageData, WebsiteHeaderNavData} from '@/lib/sanity'
import {urlFor} from '@/lib/sanity'
import {objectPositionFromHotspot} from '@/lib/homeStagedPlacements'
import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {StagedHeroCycle} from '@/components/home/StagedHeroCycle'
import {CtaHrefLink} from '@/components/home/heroShared'
import styles from '@/components/home/homeHero.module.css'
import staged from '@/components/home/homeStagedHero.module.css'
import m from './marketingFullBleedHero.module.css'
import {useHydrationSafeReducedMotion} from '@/components/home/useHydrationSafeReducedMotion'

type Cta = {label: string; href: string}

type Props = {
  marketing: MarketingPageData | null
  headerNav: WebsiteHeaderNavData | null
  cta: Cta | null
  children?: ReactNode
}

export function MarketingFullBleedHero({marketing, headerNav, cta, children}: Props) {
  const shouldReduceMotion = useHydrationSafeReducedMotion()
  const contentAnimationState = 'visible' as const

  const idSuffix = (marketing?._id ?? 'unknown').replace(/[^a-z0-9-]/gi, '')
  const mobileNavId = `mobile-nav-marketing-${idSuffix}`
  const titleId = `marketing-hero-title-${idSuffix}`

  const states = useMemo(() => marketing?.heroStates ?? [], [marketing?.heroStates])
  const useMulti =
    marketing?.heroPresentation === 'multi_state' && Array.isArray(states) && states.length > 0
  const transitionMs = marketing?.heroStageTransitionMs ?? 650

  const heroAsset = marketing?.heroImage?.asset
  const hasSinglePhoto = Boolean(heroAsset && (heroAsset._ref || heroAsset._id || heroAsset.url))
  const backgroundImageUrl =
    marketing &&
    !useMulti &&
    hasSinglePhoto &&
    marketing.heroImage
      ? urlFor(marketing.heroImage).width(2400).height(1600).fit('max').auto('format').url()
      : null
  const objectPosition = objectPositionFromHotspot(marketing?.heroImage?.hotspot)

  const visualBg =
    marketing && !useMulti && !backgroundImageUrl ? {background: '#2d3748'} : undefined

  return (
    <main className={m.pageMain}>
      <div className={m.root}>
        {marketing ? (
          <section className={m.visualBand} style={visualBg} aria-labelledby={titleId}>
            {useMulti ? <StagedHeroCycle states={states} transitionMs={transitionMs} layout="hero" /> : null}
            {!useMulti && backgroundImageUrl ? (
              <div className={m.photoRoot}>
                <Image
                  src={backgroundImageUrl}
                  alt={marketing.heroImage?.alt?.trim() || marketing.heroTitle}
                  fill
                  priority
                  sizes="100vw"
                  className={m.photoImg}
                  style={{
                    objectFit: 'cover',
                    ...(objectPosition ? {objectPosition} : {}),
                  }}
                />
              </div>
            ) : null}
            <div className={m.navShell}>
              <SiteNavChrome header={headerNav} mobileNavId={mobileNavId} />
            </div>

            <div className={m.heroInner}>
              <div className={m.heroCopy}>
                <motion.h1
                  id={titleId}
                  className={`${styles.heroTitle} ${staged.stagedHeroTitle}`}
                  initial="hidden"
                  animate={contentAnimationState}
                  variants={{
                    hidden: {opacity: 0, y: 28},
                    visible: {opacity: 1, y: 0},
                  }}
                  transition={{duration: shouldReduceMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05}}
                >
                  {marketing.heroTitle}
                </motion.h1>

                {marketing.heroSubtitle?.trim() || cta ? (
                  <motion.div
                    className={staged.stagedHeroMeta}
                    initial="hidden"
                    animate={contentAnimationState}
                    variants={{
                      hidden: {opacity: 0, y: 22},
                      visible: {opacity: 1, y: 0},
                    }}
                    transition={{duration: shouldReduceMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.11}}
                  >
                    {marketing.heroSubtitle?.trim() ? (
                      <p className={m.subtitle}>{marketing.heroSubtitle.trim()}</p>
                    ) : null}
                    {cta ? (
                      <div className={m.ctaWrap}>
                        <CtaHrefLink href={cta.href} className={styles.downloadButton}>
                          {cta.label}
                        </CtaHrefLink>
                      </div>
                    ) : null}
                  </motion.div>
                ) : null}
              </div>
              <div className={m.heroVisualSpacer} aria-hidden="true" />
            </div>
          </section>
        ) : null}
      </div>
      {children}
    </main>
  )
}

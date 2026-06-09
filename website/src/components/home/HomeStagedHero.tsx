'use client'

import {useMemo} from 'react'
import Image from 'next/image'
import {motion} from 'framer-motion'
import type {HomeCatalogSearchNav} from '@/lib/catalog/home-catalog-search-nav'
import type {HomeHeroStagedInfoItem, HomePageData} from '@/lib/sanity'
import {urlFor} from '@/lib/sanity'
import {HomeHeroActionBlock} from './HomeHeroActionBlock'
import {homeHeroActionFromPage} from '@/lib/home-hero-action'
import {StagedHeroCycle} from './StagedHeroCycle'
import {SiteNavChrome} from './SiteNavChrome'
import styles from './homeHero.module.css'
import staged from './homeStagedHero.module.css'
import {useHydrationSafeReducedMotion} from './useHydrationSafeReducedMotion'

type Props = {
  homePage: HomePageData
  catalogSearchNav: HomeCatalogSearchNav | null
}

function stagedInfoHasIcon(item: HomeHeroStagedInfoItem) {
  return Boolean(item.icon?.asset && (item.icon.asset._ref || item.icon.asset.url))
}

function StagedHeroInfoRow({items}: {items?: HomeHeroStagedInfoItem[] | null}) {
  const list = (items ?? []).filter((it) => it.text?.trim())
  if (!list.length) return null
  return (
    <div className={staged.infoRow}>
      {list.map((it) => (
        <span key={it._key} className={staged.infoItem}>
          {stagedInfoHasIcon(it) ? (
            <span className={staged.infoIcon}>
              <Image
                className={staged.infoIconImg}
                src={urlFor(it.icon!).width(96).height(96).fit('max').url()}
                alt=""
                width={22}
                height={22}
                sizes="22px"
              />
            </span>
          ) : null}
          <span>{it.text.trim()}</span>
        </span>
      ))}
    </div>
  )
}

export function HomeStagedHero({homePage, catalogSearchNav}: Props) {
  const shouldReduceMotion = useHydrationSafeReducedMotion()
  const states = useMemo(() => homePage.heroStates ?? [], [homePage.heroStates])
  const transitionMs = homePage.heroStageTransitionMs ?? 650

  const mobileNavId = 'mobile-nav-staged'
  const contentAnimationState = 'visible' as const

  const searchPlaceholder =
    homePage.heroStagedSearchPlaceholder?.trim() || 'Que souhaitez-vous porter ?'
  const searchButtonLabel = homePage.heroStagedSearchButtonLabel?.trim() || 'Rechercher'
  const heroSubtitle = homePage.heroSubtitle?.trim()
  const heroAction = homeHeroActionFromPage(homePage)

  const stagedSizes =
    '(max-width: 1200px) min(82vw, 420px), min(92vw, 2400px)'

  return (
    <div
      className={`${styles.hero} ${styles.heroStagedStack} ${styles.heroWithSectionSpacing} ${staged.stagedHeroRoot}`}
    >
      <div className={staged.stagedHeroBackdrop}>
        <div className={staged.stagedHeroBackdropInset}>
          {states.length > 0 ? (
            <StagedHeroCycle
              states={states}
              transitionMs={transitionMs}
              layout="hero"
              sizes={stagedSizes}
              className={staged.stagedHeroCycleMount}
            />
          ) : null}
          <div className={staged.overlayStaged} aria-hidden="true" />
        </div>
      </div>

      <div className={`${styles.contentLayer} ${staged.stagedHeroContentLayer}`}>
        <SiteNavChrome header={homePage} mobileNavId={mobileNavId} mobileSurface="dark" />

        <section className={staged.stagedHeroLower}>
          <div className={staged.stagedHeroColumn}>
            <div className={staged.stagedHeroTitleWrap}>
              <motion.h1
                className={`${styles.heroTitle} ${staged.stagedHeroTitle}`}
                initial="hidden"
                animate={contentAnimationState}
                variants={{
                  hidden: {opacity: 0, y: 48},
                  visible: {opacity: 1, y: 0},
                }}
                transition={{duration: shouldReduceMotion ? 0 : 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.06}}
              >
                {homePage.heroTitle}
              </motion.h1>
              {heroSubtitle ? (
                <motion.p
                  className={staged.stagedHeroSubtitle}
                  initial="hidden"
                  animate={contentAnimationState}
                  variants={{
                    hidden: {opacity: 0, y: 24},
                    visible: {opacity: 1, y: 0},
                  }}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 0.72,
                    ease: [0.16, 1, 0.3, 1],
                    delay: shouldReduceMotion ? 0 : 0.1,
                  }}
                >
                  {heroSubtitle}
                </motion.p>
              ) : null}
            </div>

            <motion.div
              className={staged.stagedHeroMeta}
              initial="hidden"
              animate={contentAnimationState}
              variants={{
                hidden: {opacity: 0, y: 32},
                visible: {opacity: 1, y: 0},
              }}
              transition={{duration: shouldReduceMotion ? 0 : 0.72, ease: [0.16, 1, 0.3, 1], delay: 0.12}}
            >
              <HomeHeroActionBlock
                nav={catalogSearchNav}
                surface="staged"
                placeholder={searchPlaceholder}
                searchButtonLabel={searchButtonLabel}
                inputId="staged-hero-search"
                action={heroAction}
              />
              <StagedHeroInfoRow items={homePage.heroStagedInfoItems} />
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  )
}

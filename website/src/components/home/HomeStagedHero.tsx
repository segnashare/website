'use client'

import {useMemo} from 'react'
import Image from 'next/image'
import {motion, useReducedMotion} from 'framer-motion'
import type {HomeHeroStagedInfoItem, HomePageData} from '@/lib/sanity'
import {urlFor} from '@/lib/sanity'
import {StagedHeroCycle} from './StagedHeroCycle'
import {SiteNavChrome} from './SiteNavChrome'
import styles from './homeHero.module.css'
import staged from './homeStagedHero.module.css'

type Props = {
  homePage: HomePageData
}

function SearchLoupeIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
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

export function HomeStagedHero({homePage}: Props) {
  const shouldReduceMotion = useReducedMotion()
  const states = useMemo(() => homePage.heroStates ?? [], [homePage.heroStates])
  const transitionMs = homePage.heroStageTransitionMs ?? 650

  const mobileNavId = 'mobile-nav-staged'
  const contentAnimationState = 'visible' as const

  const searchPlaceholder =
    homePage.heroStagedSearchPlaceholder?.trim() || 'Que souhaitez-vous porter ?'
  const searchButtonLabel = homePage.heroStagedSearchButtonLabel?.trim() || 'Rechercher'

  return (
    <div className={styles.hero}>
      {states.length > 0 ? (
        <StagedHeroCycle states={states} transitionMs={transitionMs} layout="hero" />
      ) : null}
      <div className={staged.overlayStaged} aria-hidden="true" />

      <div className={styles.contentLayer}>
        <SiteNavChrome header={homePage} mobileNavId={mobileNavId} />

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
              <div className={staged.searchBar} role="search">
                <input
                  id="staged-hero-search"
                  className={staged.searchInput}
                  type="search"
                  name="hero-search"
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  autoComplete="off"
                />
                <button type="button" className={staged.searchBubble}>
                  <span className={staged.searchBubbleIcon}>
                    <SearchLoupeIcon />
                  </span>
                  {searchButtonLabel}
                </button>
              </div>
              <StagedHeroInfoRow items={homePage.heroStagedInfoItems} />
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  )
}

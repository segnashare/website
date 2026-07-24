'use client'

import {useEffect, useMemo, useState} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {motion} from 'framer-motion'
import type {HomeCatalogSearchNav} from '@/lib/catalog/home-catalog-search-nav'
import {heroTitlePlainText} from '@/lib/hero-title'
import type {HomePageData} from '@/lib/sanity'
import {HomeHeroActionBlock} from './HomeHeroActionBlock'
import {homeHeroActionFromPage} from '@/lib/home-hero-action'
import {visibleMobileMainNavItems} from '@/lib/mobileMainNav'
import {CartNavLink} from '@/components/cart/CartNavLink'
import {CtaHrefLink} from './heroShared'
import {MobileMainMenu} from './MobileMainMenu'
import {useNavScrollElevated} from './useNavScrollElevated'
import styles from './homeHero.module.css'
import {useHydrationSafeReducedMotion} from './useHydrationSafeReducedMotion'

type HomeHeroProps = {
  homePage: HomePageData
  backgroundImageUrl?: string
  catalogSearchNav: HomeCatalogSearchNav | null
}

export function HomeHero({homePage, backgroundImageUrl, catalogSearchNav}: HomeHeroProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isIntroComplete, setIsIntroComplete] = useState(false)
  const pathname = usePathname() || '/'
  const shouldReduceMotion = useHydrationSafeReducedMotion()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMenuOpen])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (shouldReduceMotion) {
      setIsIntroComplete(true)
      return
    }

    const timer = window.setTimeout(() => {
      setIsIntroComplete(true)
    }, 2600)

    return () => window.clearTimeout(timer)
  }, [shouldReduceMotion])

  const navItems = homePage.navItems ?? []

  const mobileMenuItems = useMemo(() => visibleMobileMainNavItems(pathname), [pathname])

  const logoUrl = homePage.segnaLogo?.asset?.url
  const logoMime = homePage.segnaLogo?.asset?.mimeType
  const logoName = homePage.segnaLogo?.asset?.originalFilename
  const showSvgLogo = Boolean(
    logoUrl &&
      (logoMime === 'image/svg+xml' ||
        logoUrl.toLowerCase().includes('.svg') ||
        logoName?.toLowerCase().endsWith('.svg')),
  )
  const brandMark = showSvgLogo && logoUrl ? (
    <img src={logoUrl} alt="Segna" className={styles.brandLogo} />
  ) : (
    <span className={styles.brand}>Segna</span>
  )
  const primaryLabel = homePage.primaryCta?.label || 'Essai gratuit'
  const primaryHref = homePage.primaryCta?.url?.trim() || '#'
  const secondaryLabel = homePage.secondaryCta?.label?.trim()
  const secondaryHref = homePage.secondaryCta?.url?.trim() || '#'
  const showSecondaryCta = Boolean(secondaryLabel)
  const showNavDivider =
    navItems.length > 0 && (showSecondaryCta || Boolean(homePage.primaryCta?.label?.trim()))
  const mobileNavId = 'mobile-nav'
  const catalogSearchPlaceholder =
    homePage.heroStagedSearchPlaceholder?.trim() || 'Marque ou catégorie…'
  const catalogSearchButtonLabel = homePage.heroStagedSearchButtonLabel?.trim() || 'Rechercher'
  const heroSubtitle = homePage.heroSubtitle?.trim()
  const heroAction = homeHeroActionFromPage(homePage)
  const introLetters = 'Segna'.split('')
  const contentAnimationState = shouldReduceMotion || isIntroComplete ? 'visible' : 'hidden'
  const navElevated = useNavScrollElevated()
  const navRootClass = `${styles.navChromeRoot} ${navElevated ? styles.navChromeRootScrolled : ''}`

  return (
    <div className={`${styles.hero} ${styles.heroWithSectionSpacing}`}>
      {backgroundImageUrl ? (
        <div className={styles.backgroundLayer}>
          <Image
            src={backgroundImageUrl}
            alt={homePage.heroImage?.alt ?? heroTitlePlainText(homePage.heroTitle)}
            fill
            priority
            sizes="100vw"
            style={{objectFit: 'cover'}}
          />
        </div>
      ) : null}
      <div className={styles.overlay} />

      <motion.div
        className={styles.introOverlay}
        initial={{y: 0}}
        animate={isIntroComplete ? {y: '-100%'} : {y: 0}}
        transition={{duration: shouldReduceMotion ? 0 : 1.05, ease: [0.22, 1, 0.36, 1]}}
        aria-hidden={isIntroComplete}
      >
        <motion.h1
          className={styles.introWord}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                delayChildren: 0.18,
                staggerChildren: 0.16,
              },
            },
          }}
        >
          {introLetters.map((letter, index) => (
            <motion.span
              key={`${letter}-${index}`}
              className={styles.introLetter}
              variants={{
                hidden: {opacity: 0, y: 18},
                visible: {opacity: 1, y: 0},
              }}
              transition={{duration: 0.55, ease: 'easeOut'}}
            >
              {letter}
            </motion.span>
          ))}
        </motion.h1>
      </motion.div>

      <div className={styles.contentLayer}>
        <div className={navRootClass}>
          <div className={styles.desktopNavSpacer} aria-hidden />
          <motion.header
            className={styles.desktopHeader}
            initial="hidden"
            animate={contentAnimationState}
            variants={{
              hidden: {opacity: 0},
              visible: {opacity: 1},
            }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.85,
              ease: [0.16, 1, 0.3, 1],
              delay: shouldReduceMotion ? 0 : 1.62,
            }}
          >
            <div className={styles.desktopBrand}>
              <Link href="/" className={styles.desktopLogoLink} aria-label="Accueil — Segna">
                <span className={styles.brandWrap}>{brandMark}</span>
              </Link>
            </div>
            <nav className={styles.desktopNavCluster} aria-label="Navigation principale">
              <ul className={styles.desktopNavLinks}>
                {navItems.map((item) => (
                  <li key={item._key}>
                    <Link href={item.href?.trim() ? item.href : '#'} className={styles.navLink}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {showNavDivider ? (
                <span className={styles.navDivider} role="separator" aria-hidden="true" />
              ) : null}
              {showSecondaryCta ? (
                <CtaHrefLink href={secondaryHref} className={styles.secondaryCta}>
                  {secondaryLabel}
                </CtaHrefLink>
              ) : null}
              <CartNavLink className={styles.navCartLink} />
              <CtaHrefLink href={primaryHref} className={styles.downloadButton}>
                {primaryLabel}
              </CtaHrefLink>
            </nav>
          </motion.header>

          <motion.header
            className={styles.mobileHeader}
            initial="hidden"
            animate={contentAnimationState}
            variants={{
              hidden: {opacity: 0},
              visible: {opacity: 1},
            }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.85,
              ease: [0.16, 1, 0.3, 1],
              delay: shouldReduceMotion ? 0 : 1.62,
            }}
          >
            <button
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
              aria-label="Toggle mobile navigation menu"
              aria-controls={mobileNavId}
              aria-expanded={isMenuOpen}
              className={`${styles.menuButton} ${isMenuOpen ? styles.menuButtonOpen : ''}`}
            >
              <span className={styles.menuBars}>
                <span className={`${styles.menuBar} ${styles.menuBarTop}`} />
                <span className={`${styles.menuBar} ${styles.menuBarBottom}`} />
              </span>
            </button>

            <Link
              href="/"
              className={`${styles.mobileHeaderLogoLink} ${styles.mobileHeaderBrand}`}
              aria-label="Accueil — Segna"
            >
              <span className={styles.brandWrap}>{brandMark}</span>
            </Link>

            <div className={styles.mobileHeaderActions}>
              <CartNavLink className={styles.navCartLink} tone="dark" />
              <CtaHrefLink href={primaryHref} className={styles.mobileHeaderCta}>
                {primaryLabel}
              </CtaHrefLink>
            </div>
          </motion.header>
        </div>

        <section className={styles.heroContent}>
          <div className={styles.heroTitleStack}>
            <motion.h1
              className={styles.heroTitle}
              initial="hidden"
              animate={contentAnimationState}
              variants={{
                hidden: {
                  opacity: 0,
                  y: 90,
                },
                visible: {
                  opacity: 1,
                  y: 0,
                },
              }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.92,
                ease: [0.16, 1, 0.3, 1],
                delay: shouldReduceMotion ? 0 : 1.2,
              }}
            >
              {homePage.heroTitle}
            </motion.h1>
            {heroSubtitle ? (
              <motion.p
                className={styles.heroSubtitle}
                initial="hidden"
                animate={contentAnimationState}
                variants={{
                  hidden: {opacity: 0, y: 24},
                  visible: {opacity: 1, y: 0},
                }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.72,
                  ease: [0.16, 1, 0.3, 1],
                  delay: shouldReduceMotion ? 0 : 1.32,
                }}
              >
                {heroSubtitle}
              </motion.p>
            ) : null}
            <motion.div
              initial="hidden"
              animate={contentAnimationState}
              variants={{
                hidden: {opacity: 0, y: 28},
                visible: {opacity: 1, y: 0},
              }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.75,
                ease: [0.16, 1, 0.3, 1],
                delay: shouldReduceMotion ? 0 : 1.38,
              }}
            >
              <HomeHeroActionBlock
                nav={catalogSearchNav}
                surface="single"
                placeholder={catalogSearchPlaceholder}
                searchButtonLabel={catalogSearchButtonLabel}
                inputId="home-hero-search"
                action={heroAction}
              />
            </motion.div>
          </div>
        </section>

        <section className={styles.mobileTitleWrap}>
          <div className={styles.heroTitleStack}>
            <motion.h1
              className={styles.mobileTitle}
              initial="hidden"
              animate={contentAnimationState}
              variants={{
                hidden: {
                  opacity: 0,
                  y: 90,
                },
                visible: {
                  opacity: 1,
                  y: 0,
                },
              }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.92,
                ease: [0.16, 1, 0.3, 1],
                delay: shouldReduceMotion ? 0 : 1.2,
              }}
            >
              {homePage.heroTitle}
            </motion.h1>
            {heroSubtitle ? (
              <motion.p
                className={styles.heroSubtitle}
                initial="hidden"
                animate={contentAnimationState}
                variants={{
                  hidden: {opacity: 0, y: 24},
                  visible: {opacity: 1, y: 0},
                }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.72,
                  ease: [0.16, 1, 0.3, 1],
                  delay: shouldReduceMotion ? 0 : 1.32,
                }}
              >
                {heroSubtitle}
              </motion.p>
            ) : null}
            <motion.div
              initial="hidden"
              animate={contentAnimationState}
              variants={{
                hidden: {opacity: 0, y: 28},
                visible: {opacity: 1, y: 0},
              }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.75,
                ease: [0.16, 1, 0.3, 1],
                delay: shouldReduceMotion ? 0 : 1.38,
              }}
            >
              <HomeHeroActionBlock
                nav={catalogSearchNav}
                surface="single"
                placeholder={catalogSearchPlaceholder}
                searchButtonLabel={catalogSearchButtonLabel}
                inputId="home-hero-search-mobile"
                action={heroAction}
              />
            </motion.div>
          </div>
        </section>

        <MobileMainMenu
          id={mobileNavId}
          open={isMenuOpen}
          items={mobileMenuItems}
          onClose={() => setIsMenuOpen(false)}
          brand={brandMark}
          primaryCta={{label: primaryLabel, href: primaryHref}}
          secondaryCta={showSecondaryCta ? {label: secondaryLabel!, href: secondaryHref} : null}
        />
      </div>
    </div>
  )
}

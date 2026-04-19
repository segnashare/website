'use client'

import {useEffect, useMemo, useState} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {motion, useReducedMotion} from 'framer-motion'
import type {HomePageData} from '@/lib/sanity'
import {CtaHrefLink} from './heroShared'
import {useNavScrollElevated} from './useNavScrollElevated'
import styles from './homeHero.module.css'

type HomeHeroProps = {
  homePage: HomePageData
  backgroundImageUrl?: string
}

export function HomeHero({homePage, backgroundImageUrl}: HomeHeroProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isIntroComplete, setIsIntroComplete] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMenuOpen])

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

  const mobileMenuItems = useMemo(() => {
    if (navItems.length > 0) return navItems
    return [
      {_key: 'mission', label: 'Mission', href: '#'},
      {_key: 'impact', label: 'Impact', href: '#'},
      {_key: 'labs', label: 'Labs', href: '#'},
      {_key: 'newsroom', label: 'Newsroom', href: '/newsroom'},
      {_key: 'careers', label: 'Careers', href: '#'},
    ]
  }, [navItems])

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
  const introLetters = 'Segna'.split('')
  const contentAnimationState = shouldReduceMotion || isIntroComplete ? 'visible' : 'hidden'
  const navElevated = useNavScrollElevated()
  const navRootClass = `${styles.navChromeRoot} ${navElevated ? styles.navChromeRootScrolled : ''}`

  return (
    <div className={styles.hero}>
      {backgroundImageUrl ? (
        <div className={styles.backgroundLayer}>
          <Image
            src={backgroundImageUrl}
            alt={homePage.heroImage?.alt ?? homePage.heroTitle}
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

            <CtaHrefLink href={primaryHref} className={styles.mobileHeaderCta}>
              {primaryLabel}
            </CtaHrefLink>
          </motion.header>
        </div>

        <section className={styles.heroContent}>
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
        </section>

        <section className={styles.mobileTitleWrap}>
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
        </section>

        <nav id={mobileNavId} className={`${styles.mobileMenuOverlay} ${isMenuOpen ? styles.mobileMenuOverlayOpen : ''}`}>
          <div className={styles.mobileMenuNav}>
            {mobileMenuItems.map((item) => (
              <Link
                key={item._key}
                href={item.href?.trim() ? item.href : '#'}
                className={styles.mobileMenuLink}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {showSecondaryCta ? (
            <div className={styles.mobileMenuCtas}>
              <CtaHrefLink
                href={secondaryHref}
                className={styles.mobileMenuSecondaryCta}
                onClick={() => setIsMenuOpen(false)}
              >
                {secondaryLabel}
              </CtaHrefLink>
            </div>
          ) : null}
        </nav>
      </div>
    </div>
  )
}

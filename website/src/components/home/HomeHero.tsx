'use client'

import {useEffect, useMemo, useState} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {motion, useReducedMotion} from 'framer-motion'
import type {HomePageData} from '@/lib/sanity'
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
  const leftNavItems = navItems.slice(0, 2)
  const rightNavItems = navItems.slice(2)

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

  const brand = homePage.brandName?.trim() || 'Segna'
  const ctaLabel = homePage.primaryCta?.label || 'Download'
  const ctaUrl = homePage.primaryCta?.url || '#'
  const contactLabel = homePage.mobileMenuContact?.label || 'Contact'
  const contactHref = homePage.mobileMenuContact?.href || '#'
  const socials = homePage.mobileMenuSocialLinks ?? []
  const mobileNavId = 'mobile-nav'
  const introLetters = 'Segna'.split('')
  const contentAnimationState = shouldReduceMotion || isIntroComplete ? 'visible' : 'hidden'

  return (
    <main className={styles.hero}>
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
        <motion.header
          className={styles.desktopHeader}
          initial="hidden"
          animate={contentAnimationState}
          variants={{
            hidden: {
              opacity: 0,
              y: -78,
            },
            visible: {
              opacity: 1,
              y: 0,
            },
          }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.85,
            ease: [0.16, 1, 0.3, 1],
            delay: shouldReduceMotion ? 0 : 1.62,
          }}
        >
          <nav className={styles.desktopNavLeft}>
            {leftNavItems.map((item) => (
              <Link key={item._key} href={item.href?.trim() ? item.href : '#'} className={styles.navLink}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.brand}>{brand}</div>
          <div className={styles.desktopNavRight}>
            {rightNavItems.map((item) => (
              <Link key={item._key} href={item.href?.trim() ? item.href : '#'} className={styles.navLink}>
                {item.label}
              </Link>
            ))}
            <Link href={ctaUrl} className={styles.downloadButton}>
              {ctaLabel}
            </Link>
          </div>
        </motion.header>

        <motion.header
          className={styles.mobileHeader}
          initial="hidden"
          animate={contentAnimationState}
          variants={{
            hidden: {
              opacity: 0,
              y: -78,
            },
            visible: {
              opacity: 1,
              y: 0,
            },
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

          <div className={`${styles.brand} ${styles.mobileHeaderBrand}`}>{brand}</div>

          <Link href={ctaUrl} className={styles.mobileHeaderCta}>
            {ctaLabel}
          </Link>
        </motion.header>

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

          <div className={styles.mobileMenuBottom}>
            <Link href={contactHref} className={styles.mobileContact} onClick={() => setIsMenuOpen(false)}>
              {contactLabel}
            </Link>
            <div className={styles.mobileSocial}>
              {socials.map((social) => (
                <Link
                  key={social._key}
                  href={social.href}
                  className={styles.mobileSocialLink}
                  aria-label={social.label}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {social.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </main>
  )
}

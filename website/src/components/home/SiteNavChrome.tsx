'use client'

import {useEffect, useMemo, useState} from 'react'
import Link from 'next/link'
import {motion, useReducedMotion} from 'framer-motion'
import type {WebsiteHeaderNavData} from '@/lib/sanity'
import {CtaHrefLink} from './heroShared'
import styles from './homeHero.module.css'

type Props = {
  header: WebsiteHeaderNavData | null
  mobileNavId: string
  /** Barre mobile : transparent (sur image), clair, ou noir (hero marketing clair). */
  mobileSurface?: 'transparent' | 'light' | 'dark'
}

export function SiteNavChrome({header, mobileNavId, mobileSurface = 'transparent'}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const contentAnimationState = 'visible' as const

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMenuOpen])

  const navItems = header?.navItems ?? []

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

  const logoUrl = header?.segnaLogo?.asset?.url
  const logoMime = header?.segnaLogo?.asset?.mimeType
  const logoName = header?.segnaLogo?.asset?.originalFilename
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
  const primaryLabel = header?.primaryCta?.label || 'Essai gratuit'
  const primaryHref = header?.primaryCta?.url?.trim() || '#'
  const secondaryLabel = header?.secondaryCta?.label?.trim()
  const secondaryHref = header?.secondaryCta?.url?.trim() || '#'
  const showSecondaryCta = Boolean(secondaryLabel)
  const showNavDivider =
    navItems.length > 0 && (showSecondaryCta || Boolean(header?.primaryCta?.label?.trim()))

  return (
    <>
      <div className={styles.desktopNavSpacer} aria-hidden />
      <motion.header
        className={styles.desktopHeader}
        initial="hidden"
        animate={contentAnimationState}
        variants={{
          hidden: {opacity: 0, y: -40},
          visible: {opacity: 1, y: 0},
        }}
        transition={{duration: shouldReduceMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1]}}
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
        className={`${styles.mobileHeader} ${mobileSurface === 'light' ? styles.mobileHeaderOnLight : ''} ${mobileSurface === 'dark' ? styles.mobileHeaderOnDark : ''}`}
        initial="hidden"
        animate={contentAnimationState}
        variants={{
          hidden: {opacity: 0, y: -40},
          visible: {opacity: 1, y: 0},
        }}
        transition={{duration: shouldReduceMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1]}}
      >
        <button
          type="button"
          onClick={() => setIsMenuOpen((value) => !value)}
          aria-label="Ouvrir ou fermer le menu"
          aria-controls={mobileNavId}
          aria-expanded={isMenuOpen}
          className={`${styles.menuButton} ${isMenuOpen ? styles.menuButtonOpen : ''}`}
        >
          <span className={styles.menuBars}>
            <span className={`${styles.menuBar} ${styles.menuBarTop}`} />
            <span className={`${styles.menuBar} ${styles.menuBarBottom}`} />
          </span>
        </button>

        <div className={`${styles.brandWrap} ${styles.mobileHeaderBrand}`}>{brandMark}</div>

        <CtaHrefLink href={primaryHref} className={styles.mobileHeaderCta}>
          {primaryLabel}
        </CtaHrefLink>
      </motion.header>

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
    </>
  )
}

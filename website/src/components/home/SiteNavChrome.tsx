'use client'

import {useEffect, useMemo, useState} from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {motion} from 'framer-motion'
import type {WebsiteHeaderNavData} from '@/lib/sanity'
import {normalizeHref} from '@/lib/normalize-href'
import {visibleMobileMainNavItems} from '@/lib/mobileMainNav'
import {AccountNavButton} from '@/components/auth/AccountNavButton'
import {CartNavLink} from '@/components/cart/CartNavLink'
import {CtaHrefLink} from './heroShared'
import {JoinClubCtaLink} from './JoinClubCtaLink'
import {MobileMainMenu} from './MobileMainMenu'
import {useNavScrollElevated} from './useNavScrollElevated'
import styles from './homeHero.module.css'
import {useHydrationSafeReducedMotion} from './useHydrationSafeReducedMotion'

type Props = {
  header: WebsiteHeaderNavData | null
  mobileNavId: string
  /** Barre mobile : transparent (sur image), clair, ou noir (hero marketing clair). */
  mobileSurface?: 'transparent' | 'light' | 'dark'
  /**
   * Fond de page : `light` = barre lisible sur fond clair (pas de hero photo),
   * style « scroll » dès le départ.
   */
  surface?: 'transparent' | 'light'
}

export function SiteNavChrome({
  header,
  mobileNavId,
  mobileSurface = 'transparent',
  surface = 'transparent',
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname() || '/'
  const shouldReduceMotion = useHydrationSafeReducedMotion()
  const contentAnimationState = 'visible' as const
  const onLightSurface = surface === 'light'
  const resolvedMobileSurface = onLightSurface ? 'light' : mobileSurface

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

  const navItems = header?.navItems ?? []

  const mobileMenuItems = useMemo(() => visibleMobileMainNavItems(pathname), [pathname])

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
  const primaryHref = normalizeHref(header?.primaryCta?.url)
  const secondaryLabel = header?.secondaryCta?.label?.trim()
  const secondaryHref = normalizeHref(header?.secondaryCta?.url)
  const showSecondaryCta = Boolean(secondaryLabel)
  const showNavDivider =
    navItems.length > 0 && (showSecondaryCta || Boolean(header?.primaryCta?.label?.trim()))

  const navElevated = useNavScrollElevated() || onLightSurface
  const navRootClass = [
    styles.navChromeRoot,
    navElevated ? styles.navChromeRootScrolled : '',
    onLightSurface ? styles.surfaceLight : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={navRootClass}>
      <div className={styles.desktopNavSpacer} aria-hidden="true" />
      <motion.header
        className={styles.desktopHeader}
        initial="hidden"
        animate={contentAnimationState}
        variants={{
          /* Pas de `y` / `transform` ici : sinon `position: fixed` du header ne reste pas accroché au viewport (cf. HomeHero). */
          hidden: {opacity: 0},
          visible: {opacity: 1},
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
                <Link href={normalizeHref(item.href)} className={styles.navLink}>
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
          <AccountNavButton className={styles.navCartLink} />
          <CartNavLink className={styles.navCartLink} />
          <JoinClubCtaLink href={primaryHref} className={styles.downloadButton}>
            {primaryLabel}
          </JoinClubCtaLink>
        </nav>
      </motion.header>

      <motion.header
        className={`${styles.mobileHeader} ${resolvedMobileSurface === 'light' ? styles.mobileHeaderOnLight : ''} ${resolvedMobileSurface === 'dark' ? styles.mobileHeaderOnDark : ''}`}
        initial="hidden"
        animate={contentAnimationState}
        variants={{
          hidden: {opacity: 0},
          visible: {opacity: 1},
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

        <Link
          href="/"
          className={`${styles.mobileHeaderLogoLink} ${styles.mobileHeaderBrand}`}
          aria-label="Accueil — Segna"
        >
          <span className={styles.brandWrap}>{brandMark}</span>
        </Link>

        <div className={styles.mobileHeaderActions}>
          <AccountNavButton className={styles.navCartLink} tone="dark" />
          <CartNavLink className={styles.navCartLink} tone="dark" />
          <JoinClubCtaLink href={primaryHref} className={styles.mobileHeaderCta}>
            {primaryLabel}
          </JoinClubCtaLink>
        </div>
      </motion.header>

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
  )
}

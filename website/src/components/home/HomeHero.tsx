'use client'

import {useEffect, useMemo, useState} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import type {HomeCatalogSearchNav} from '@/lib/catalog/home-catalog-search-nav'
import {heroTitlePlainText} from '@/lib/hero-title'
import type {HomePageData} from '@/lib/sanity'
import {HomeHeroActionBlock} from './HomeHeroActionBlock'
import {HeroTrustpilotRating} from './HeroTrustpilotRating'
import {homeHeroActionFromPage} from '@/lib/home-hero-action'
import {visibleMobileMainNavItems} from '@/lib/mobileMainNav'
import {AccountNavButton} from '@/components/auth/AccountNavButton'
import {CartNavLink} from '@/components/cart/CartNavLink'
import {CtaHrefLink} from './heroShared'
import {JoinClubCtaLink} from './JoinClubCtaLink'
import {MobileMainMenu} from './MobileMainMenu'
import {useNavScrollElevated} from './useNavScrollElevated'
import styles from './homeHero.module.css'

type HomeHeroProps = {
  homePage: HomePageData
  backgroundImageUrl?: string
  catalogSearchNav: HomeCatalogSearchNav | null
}

export function HomeHero({homePage, backgroundImageUrl, catalogSearchNav}: HomeHeroProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname() || '/'

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

      <div className={styles.contentLayer}>
        <div className={navRootClass}>
          <div className={styles.desktopNavSpacer} aria-hidden />
          <header className={styles.desktopHeader}>
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
              <AccountNavButton className={styles.navCartLink} />
              <CartNavLink className={styles.navCartLink} />
              <JoinClubCtaLink href={primaryHref} className={styles.downloadButton}>
                {primaryLabel}
              </JoinClubCtaLink>
            </nav>
          </header>

          <header className={styles.mobileHeader}>
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
              <AccountNavButton className={styles.navCartLink} tone="dark" />
              <CartNavLink className={styles.navCartLink} tone="dark" />
              <JoinClubCtaLink href={primaryHref} className={styles.mobileHeaderCta}>
                {primaryLabel}
              </JoinClubCtaLink>
            </div>
          </header>
        </div>

        <section className={styles.heroContent}>
          <div className={styles.heroTitleStack}>
            <h1 className={styles.heroTitle}>{homePage.heroTitle}</h1>
            {heroSubtitle ? <p className={styles.heroSubtitle}>{heroSubtitle}</p> : null}
            <HeroTrustpilotRating />
            <HomeHeroActionBlock
              nav={catalogSearchNav}
              surface="single"
              placeholder={catalogSearchPlaceholder}
              searchButtonLabel={catalogSearchButtonLabel}
              inputId="home-hero-search"
              action={heroAction}
            />
          </div>
        </section>

        <section className={styles.mobileTitleWrap}>
          <div className={styles.heroTitleStack}>
            <h1 className={styles.mobileTitle}>{homePage.heroTitle}</h1>
            {heroSubtitle ? <p className={styles.heroSubtitle}>{heroSubtitle}</p> : null}
            <HeroTrustpilotRating />
            <HomeHeroActionBlock
              nav={catalogSearchNav}
              surface="single"
              placeholder={catalogSearchPlaceholder}
              searchButtonLabel={catalogSearchButtonLabel}
              inputId="home-hero-search-mobile"
              action={heroAction}
            />
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

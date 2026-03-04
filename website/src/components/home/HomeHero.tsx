'use client'

import {useEffect, useMemo, useState} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type {HomePageData} from '@/lib/sanity'
import styles from './homeHero.module.css'

type HomeHeroProps = {
  homePage: HomePageData
  backgroundImageUrl?: string
}

export function HomeHero({homePage, backgroundImageUrl}: HomeHeroProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMenuOpen])

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

      <header className={styles.desktopHeader}>
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

        <div className={`${styles.brand} ${styles.mobileHeaderBrand}`}>{brand}</div>

        <Link href={ctaUrl} className={styles.mobileHeaderCta}>
          {ctaLabel}
        </Link>
      </header>

      <section className={styles.heroContent}>
        <h1 className={styles.heroTitle}>{homePage.heroTitle}</h1>
      </section>

      <section className={styles.mobileTitleWrap}>
        <h1 className={styles.mobileTitle}>{homePage.heroTitle}</h1>
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
    </main>
  )
}

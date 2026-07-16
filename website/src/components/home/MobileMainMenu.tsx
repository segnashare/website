'use client'

import {useEffect, useState, type ReactNode} from 'react'
import {createPortal} from 'react-dom'
import Link from 'next/link'
import type {MobileMainNavItem} from '@/lib/mobileMainNav'
import {CtaHrefLink} from './heroShared'
import styles from './homeHero.module.css'

type Props = {
  id: string
  open: boolean
  items: MobileMainNavItem[]
  onClose: () => void
  brand: ReactNode
  primaryCta: {label: string; href: string}
  secondaryCta?: {label: string; href: string} | null
}

/**
 * Menu mobile plein viewport (portal body) : évite le clip du hero catalogue (50vh + overflow).
 * Ouverture haut → bas. Barre du haut (X / logo / CTA) dans le portal pour rester cliquable.
 */
export function MobileMainMenu({
  id,
  open,
  items,
  onClose,
  brand,
  primaryCta,
  secondaryCta,
}: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      className={`${styles.mobileMenuLayer} ${open ? styles.mobileMenuLayerOpen : ''}`}
      aria-hidden={!open}
    >
      <div className={`${styles.mobileHeader} ${styles.mobileMenuHeader}`}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          aria-controls={id}
          aria-expanded={open}
          className={`${styles.menuButton} ${styles.menuButtonOpen}`}
          tabIndex={open ? undefined : -1}
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
          tabIndex={open ? undefined : -1}
          onClick={onClose}
        >
          <span className={styles.brandWrap}>{brand}</span>
        </Link>

        <CtaHrefLink
          href={primaryCta.href}
          className={styles.mobileHeaderCta}
          tabIndex={open ? undefined : -1}
          onClick={onClose}
        >
          {primaryCta.label}
        </CtaHrefLink>
      </div>

      <nav id={id} className={styles.mobileMenuOverlay}>
        <div className={styles.mobileMenuNav}>
          {items.map((item) => (
            <Link
              key={item._key}
              href={item.href?.trim() ? item.href : '#'}
              className={styles.mobileMenuLink}
              tabIndex={open ? undefined : -1}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {secondaryCta?.label ? (
          <div className={styles.mobileMenuCtas}>
            <CtaHrefLink
              href={secondaryCta.href}
              className={styles.mobileMenuSecondaryCta}
              tabIndex={open ? undefined : -1}
              onClick={onClose}
            >
              {secondaryCta.label}
            </CtaHrefLink>
          </div>
        ) : null}
      </nav>
    </div>,
    document.body,
  )
}

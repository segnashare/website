'use client'

import Link from 'next/link'
import type {CSSProperties} from 'react'
import {useMemo, useState} from 'react'
import type {PortableTextBlock} from '@portabletext/types'
import {PortableRichText} from '@/components/cms/PortableRichText'
import type {SplitPane} from '@/lib/sanity'
import styles from './splitFeatureSection.module.css'

type Props = {
  pane: SplitPane
  foregroundColor: string
}

function blocksNonEmpty(value?: PortableTextBlock[] | null) {
  return Array.isArray(value) && value.length > 0
}

function ctaPair(label?: string | null, href?: string | null) {
  const l = label?.trim()
  const h = href?.trim()
  return l && h ? {label: l, href: h} : null
}

/** Libellé Sanity (string ou valeur inattendue) → texte affichable. */
function tabLabelText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim()
  return ''
}

/** Sanity peut renvoyer true / "true" selon la chaîne de publication. */
function isDualTabsEnabledFlag(value: unknown): boolean {
  if (value === true) return true
  if (value === false || value == null) return false
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1'
  return Boolean(value)
}

export function SplitPaneText({pane, foregroundColor}: Props) {
  const tab1Text = tabLabelText(pane.tab1Label)
  const tab2Text = tabLabelText(pane.tab2Label)
  const dualOn = isDualTabsEnabledFlag(pane.dualTabsEnabled)
  /**
   * Afficher la barre d’onglets si :
   * — les deux libellés sont renseignés (même si le booléen « deux états » manque en base), ou
   * — option « deux états » cochée + au moins un libellé, un corps d’onglet ou le corps unique.
   */
  const showTabs =
    (Boolean(tab1Text) && Boolean(tab2Text)) ||
    (dualOn &&
      (Boolean(tab1Text) ||
        Boolean(tab2Text) ||
        blocksNonEmpty(pane.tab1Body) ||
        blocksNonEmpty(pane.tab2Body) ||
        blocksNonEmpty(pane.body)))
  const displayTab1 = tab1Text || 'État 1'
  const displayTab2 = tab2Text || 'État 2'

  const [active, setActive] = useState<0 | 1>(0)

  const activeBody = useMemo(() => {
    if (!showTabs) return pane.body
    if (active === 0) {
      if (blocksNonEmpty(pane.tab1Body)) return pane.tab1Body
      return blocksNonEmpty(pane.body) ? pane.body : pane.tab1Body
    }
    if (blocksNonEmpty(pane.tab2Body)) return pane.tab2Body
    return blocksNonEmpty(pane.body) ? pane.body : pane.tab2Body
  }, [active, showTabs, pane.body, pane.tab1Body, pane.tab2Body])

  const legacyCta = ctaPair(pane.ctaLabel, pane.ctaHref)
  const activeCta = showTabs
    ? active === 0
      ? ctaPair(pane.cta1Label, pane.cta1Href)
      : ctaPair(pane.cta2Label, pane.cta2Href)
    : legacyCta

  const paneStyle: CSSProperties = {
    color: foregroundColor,
    ['--split-pane-fg' as string]: foregroundColor,
  }

  return (
    <div className={`${styles.pane} ${styles.textPane}`} style={paneStyle}>
      <div className={styles.textPaneStack}>
        {pane.heading?.trim() ? <h2 className={styles.heading}>{pane.heading.trim()}</h2> : null}

        {showTabs ? (
          <div className={styles.tabRailGrid} role="tablist" aria-label="Contenu à bascule">
            <button
              type="button"
              role="tab"
              aria-selected={active === 0}
              className={`${styles.tab} ${active === 0 ? styles.tabActive : ''}`}
              onClick={() => setActive(0)}
            >
              {displayTab1}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={active === 1}
              className={`${styles.tab} ${active === 1 ? styles.tabActive : ''}`}
              onClick={() => setActive(1)}
            >
              {displayTab2}
            </button>
          </div>
        ) : null}

        {blocksNonEmpty(activeBody) ? (
          <PortableRichText value={activeBody!} className={styles.body} />
        ) : null}

        {activeCta ? (
          activeCta.href.startsWith('/') ? (
            <Link href={activeCta.href} className={styles.cta}>
              {activeCta.label}
            </Link>
          ) : (
            <a href={activeCta.href} className={styles.cta}>
              {activeCta.label}
            </a>
          )
        ) : null}
      </div>
    </div>
  )
}

'use client'

import type {HomeCatalogSearchNav} from '@/lib/catalog/home-catalog-search-nav'
import {HomeCatalogQuickSearch} from './HomeCatalogQuickSearch'
import {CtaHrefLink} from './heroShared'
import styles from './homeHero.module.css'
import staged from './homeStagedHero.module.css'

type Props = {
  nav: HomeCatalogSearchNav | null
  surface: 'staged' | 'single'
  placeholder: string
  searchButtonLabel: string
  inputId: string
  cta?: {label: string; href: string; position: 'left' | 'right'} | null
}

export function HomeHeroSearchRow({
  nav,
  surface,
  placeholder,
  searchButtonLabel,
  inputId,
  cta,
}: Props) {
  const search = (
    <HomeCatalogQuickSearch
      nav={nav}
      surface={surface}
      placeholder={placeholder}
      searchButtonLabel={searchButtonLabel}
      inputId={inputId}
    />
  )

  if (!cta) {
    return <div className={staged.heroSearchRow}>{search}</div>
  }

  const button = (
    <CtaHrefLink href={cta.href} className={staged.heroSearchCta}>
      {cta.label}
    </CtaHrefLink>
  )

  return (
    <div
      className={`${staged.heroSearchRow} ${
        cta.position === 'left' ? staged.heroSearchRowCtaLeft : staged.heroSearchRowCtaRight
      }`}
    >
      {cta.position === 'left' ? button : null}
      <div className={styles.heroSearchField}>{search}</div>
      {cta.position === 'right' ? button : null}
    </div>
  )
}

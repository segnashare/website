'use client'

import type {HomeCatalogSearchNav} from '@/lib/catalog/home-catalog-search-nav'
import type {HomeHeroAction} from '@/lib/home-hero-action'
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
  action: HomeHeroAction
}

export function HomeHeroActionBlock({
  nav,
  surface,
  placeholder,
  searchButtonLabel,
  inputId,
  action,
}: Props) {
  const {layout, primaryCta, secondaryCta, ctaPosition, showSearch} = action
  const onPhoto = surface === 'single' ? staged.heroActionOnPhoto : ''

  const search = showSearch ? (
    <HomeCatalogQuickSearch
      nav={nav}
      surface={surface}
      placeholder={placeholder}
      searchButtonLabel={searchButtonLabel}
      inputId={inputId}
    />
  ) : null

  const primaryButton = primaryCta ? (
    <CtaHrefLink href={primaryCta.href} className={staged.heroSearchCta}>
      {primaryCta.label}
    </CtaHrefLink>
  ) : null

  const secondaryButton = secondaryCta ? (
    <CtaHrefLink href={secondaryCta.href} className={staged.heroSearchCtaSecondary}>
      {secondaryCta.label}
    </CtaHrefLink>
  ) : null

  if (layout === 'search_only' && search) {
    return <div className={`${staged.heroSearchRow} ${onPhoto}`.trim()}>{search}</div>
  }

  if (layout === 'single_cta' && primaryButton) {
    return (
      <div className={`${staged.heroSearchRow} ${staged.heroActionRowCtasOnly} ${onPhoto}`.trim()}>
        {primaryButton}
      </div>
    )
  }

  if (layout === 'dual_cta' && (primaryButton || secondaryButton)) {
    return (
      <div className={`${staged.heroSearchRow} ${staged.heroActionRowCtasOnly} ${onPhoto}`.trim()}>
        {primaryButton}
        {secondaryButton}
      </div>
    )
  }

  if (layout === 'cta_and_search' && search && primaryButton) {
    return (
      <div
        className={`${staged.heroSearchRow} ${onPhoto} ${
          ctaPosition === 'left' ? staged.heroActionRowCtaLeft : staged.heroActionRowCtaRight
        }`.trim()}
      >
        {ctaPosition === 'left' ? primaryButton : null}
        <div className={styles.heroSearchField}>{search}</div>
        {ctaPosition === 'right' ? primaryButton : null}
      </div>
    )
  }

  if (search) {
    return <div className={`${staged.heroSearchRow} ${onPhoto}`.trim()}>{search}</div>
  }

  return null
}

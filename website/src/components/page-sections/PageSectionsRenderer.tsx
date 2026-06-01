import {Suspense} from 'react'
import type {HomeSection, PageSection} from '@/lib/sanity'
import {SectionCatalogPuzzle} from './SectionCatalogPuzzle'
import {SectionHorizontalScrollCards} from './SectionHorizontalScrollCards'
import {SectionHelpCenterHub} from './SectionHelpCenterHub'
import {SectionProse} from './SectionProse'
import {SectionQuote} from './SectionQuote'
import {SectionSplitFeature} from './SectionSplitFeature'
import {SectionSplitMedia} from './SectionSplitMedia'
import {SectionStatementBand} from './SectionStatementBand'
import {SectionThreeStepCards} from './SectionThreeStepCards'
import {SectionTriptych} from './SectionTriptych'
import {SectionTwoColumnTable} from './SectionTwoColumnTable'
import {SectionWebsiteDbCatalog} from './SectionWebsiteDbCatalog'
import {SectionVisibilityGate} from './sectionVisibility'
import styles from './page-sections.module.css'

export type PageSectionsRendererProps = {
  sections?: PageSection[] | null
  variant?: 'onDark' | 'onLight'
  /** Réduit le padding haut quand les sections suivent un hero plein écran (100vh). */
  afterFullBleedHero?: boolean
}

function isRichTextSection(section: PageSection): section is Extract<PageSection, {_type: 'richTextSection'}> {
  return section._type === 'richTextSection'
}

function isTwoColumnTableSection(
  section: PageSection,
): section is Extract<PageSection, {_type: 'twoColumnTableSection'}> {
  return section._type === 'twoColumnTableSection'
}

function isHelpCenterHubSection(
  section: PageSection,
): section is Extract<PageSection, {_type: 'helpCenterHubSection'}> {
  return section._type === 'helpCenterHubSection'
}

function isStatementBand(section: PageSection): section is Extract<PageSection, {_type: 'statementBand'}> {
  return section._type === 'statementBand'
}

function isQuoteSection(section: PageSection): section is Extract<PageSection, {_type: 'quoteSection'}> {
  return section._type === 'quoteSection'
}

function isTriptychSection(section: PageSection): section is Extract<PageSection, {_type: 'triptychSection'}> {
  return section._type === 'triptychSection'
}

function isThreeStepCardsSection(
  section: PageSection,
): section is Extract<PageSection, {_type: 'threeStepCardsSection'}> {
  return section._type === 'threeStepCardsSection'
}

function isCatalogPuzzleSection(
  section: PageSection,
): section is Extract<PageSection, {_type: 'catalogPuzzleSection'}> {
  return section._type === 'catalogPuzzleSection'
}

function isHorizontalScrollCardsSection(
  section: PageSection,
): section is Extract<PageSection, {_type: 'horizontalScrollCardsSection'}> {
  return section._type === 'horizontalScrollCardsSection'
}

function isWebsiteDbCatalogSection(
  section: PageSection,
): section is Extract<PageSection, {_type: 'websiteDbCatalogSection'}> {
  return section._type === 'websiteDbCatalogSection'
}

function isSplitFeatureSection(
  section: PageSection,
): section is Extract<PageSection, {_type: 'splitFeatureSection'}> {
  return section._type === 'splitFeatureSection'
}

function isSectionBlock(section: PageSection): boolean {
  if (section._type === 'sectionBlock') return true
  if (!section._type && 'title' in section && 'text' in section) return true
  return false
}

export function PageSectionsRenderer({
  sections,
  variant = 'onLight',
  afterFullBleedHero,
}: PageSectionsRendererProps) {
  if (!sections?.length) return null

  const shellClass = [
    styles.shell,
    variant === 'onDark' ? styles.shellOnDark : '',
    afterFullBleedHero ? styles.shellAfterFullBleed : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
      {sections.map((section, index) => {
        const key = section._key

        const gate = (content: React.ReactNode) => (
          <SectionVisibilityGate key={key} section={section}>
            {content}
          </SectionVisibilityGate>
        )

        if (isHelpCenterHubSection(section)) {
          return gate(<SectionHelpCenterHub section={section} />)
        }

        if (isStatementBand(section)) {
          return gate(<SectionStatementBand section={section} />)
        }

        if (isQuoteSection(section)) {
          return gate(<SectionQuote section={section} />)
        }

        if (isThreeStepCardsSection(section)) {
          return gate(<SectionThreeStepCards section={section} />)
        }

        if (isTriptychSection(section)) {
          return gate(<SectionTriptych section={section} />)
        }

        if (isCatalogPuzzleSection(section)) {
          return gate(<SectionCatalogPuzzle section={section} />)
        }

        if (isHorizontalScrollCardsSection(section)) {
          return gate(<SectionHorizontalScrollCards section={section} />)
        }

        if (isWebsiteDbCatalogSection(section)) {
          return gate(
            <Suspense fallback={<p className={styles.asyncFallback}>Chargement du catalogue…</p>}>
              <SectionWebsiteDbCatalog section={section} />
            </Suspense>,
          )
        }

        if (isSplitFeatureSection(section)) {
          return gate(<SectionSplitFeature section={section} />)
        }

        if (isRichTextSection(section)) {
          return gate(<SectionProse section={section} />)
        }

        if (isTwoColumnTableSection(section)) {
          return gate(<SectionTwoColumnTable section={section} />)
        }

        if (isSectionBlock(section)) {
          const splitCount = sections.slice(0, index).filter((s) => isSectionBlock(s)).length
          const imagePosition = splitCount % 2 === 0 ? 'left' : 'right'
          return gate(
            <SectionSplitMedia section={section as HomeSection} imagePosition={imagePosition} />,
          )
        }

        return null
      })}
    </div>
  )
}

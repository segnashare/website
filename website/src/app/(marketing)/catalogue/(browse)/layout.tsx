import {MarketingFullBleedHero} from '@/components/layout/MarketingFullBleedHero'
import {PageSections} from '@/components/cms/PageSections'
import {getCatalogueMarketingShell} from '@/lib/catalog/catalogue-marketing-shell'

export const revalidate = 86400

export default async function CatalogueBrowseLayout({children}: {children: React.ReactNode}) {
  const {marketingPage, headerNav, cta, sections} = await getCatalogueMarketingShell()

  return (
    <MarketingFullBleedHero marketing={marketingPage} headerNav={headerNav} cta={cta} tightBelowHero>
      {sections.length > 0 ? (
        <div className="container" style={{paddingBlock: '0 2rem'}}>
          <PageSections sections={sections} afterFullBleedHero />
        </div>
      ) : null}

      {children}
    </MarketingFullBleedHero>
  )
}

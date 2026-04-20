import {MarketingFullBleedHero} from '@/components/layout/MarketingFullBleedHero'
import {PageSections} from '@/components/cms/PageSections'
import {getCatalogueMarketingShell} from '@/lib/catalog/catalogue-marketing-shell'

export const revalidate = 30

export default async function CatalogueBrowseLayout({children}: {children: React.ReactNode}) {
  const {marketingPage, headerNav, cta, sections} = await getCatalogueMarketingShell()

  return (
    <main>
      {marketingPage ? (
        <MarketingFullBleedHero marketing={marketingPage} headerNav={headerNav} cta={cta} />
      ) : null}

      <div className="container" style={{paddingBlock: marketingPage ? '0 2rem' : '2rem'}}>
        {sections.length > 0 ? <PageSections sections={sections} afterFullBleedHero /> : null}
      </div>

      {children}
    </main>
  )
}

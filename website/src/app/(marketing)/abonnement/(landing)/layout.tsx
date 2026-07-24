import {PageSections} from '@/components/cms/PageSections'
import {MarketingFullBleedHero} from '@/components/layout/MarketingFullBleedHero'
import {getAbonnementMarketingShell} from '@/lib/subscription/abonnement-marketing-shell'

export const revalidate = 3600

export default async function AbonnementLayout({children}: {children: React.ReactNode}) {
  const {marketingPage, headerNav, cta, sections} = await getAbonnementMarketingShell()

  return (
    <MarketingFullBleedHero marketing={marketingPage} headerNav={headerNav} cta={cta}>
      {children}
      {sections.length > 0 ? <PageSections sections={sections} afterFullBleedHero /> : null}
    </MarketingFullBleedHero>
  )
}

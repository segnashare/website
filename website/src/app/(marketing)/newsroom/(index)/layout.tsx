import {MarketingFullBleedHero} from '@/components/layout/MarketingFullBleedHero'
import {getNewsroomMarketingShell} from '@/lib/newsroom-marketing-shell'

export const revalidate = 3600

/** Hero plein écran (même composant que le catalogue) — liste Newsroom uniquement. */
export default async function NewsroomIndexLayout({children}: {children: React.ReactNode}) {
  const {marketing, headerNav, cta} = await getNewsroomMarketingShell()

  return (
    <MarketingFullBleedHero marketing={marketing} headerNav={headerNav} cta={cta} tightBelowHero>
      {children}
    </MarketingFullBleedHero>
  )
}

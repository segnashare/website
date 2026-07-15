import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

export const revalidate = 86400

/** Navbar site uniquement — pas de page / hero Sanity catalogue. */
export default async function CataloguePieceLayout({children}: {children: React.ReactNode}) {
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <>
      <SiteNavChrome
        header={headerNav}
        mobileNavId="mobile-nav-catalogue-piece"
        surface="light"
      />
      {children}
    </>
  )
}

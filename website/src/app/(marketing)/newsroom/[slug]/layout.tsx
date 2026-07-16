import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

export const revalidate = 3600

export default async function NewsroomPostLayout({children}: {children: React.ReactNode}) {
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <>
      <SiteNavChrome header={headerNav} mobileNavId="mobile-nav-newsroom-post" surface="light" />
      {children}
    </>
  )
}

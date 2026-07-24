import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

export const revalidate = 86400

export default async function PanierLayout({children}: {children: React.ReactNode}) {
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <div style={{minHeight: '100vh', background: '#fff'}}>
      <SiteNavChrome header={headerNav} mobileNavId="mobile-nav-panier" surface="light" />
      {children}
    </div>
  )
}

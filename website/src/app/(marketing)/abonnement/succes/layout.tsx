import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

export const revalidate = 86400

/** Page succès post-checkout : même chrome que le récap. */
export default async function AbonnementSuccesLayout({children}: {children: React.ReactNode}) {
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <div style={{minHeight: '100vh', background: '#fff'}}>
      <SiteNavChrome header={headerNav} mobileNavId="mobile-nav-abonnement-succes" surface="light" />
      {children}
    </div>
  )
}

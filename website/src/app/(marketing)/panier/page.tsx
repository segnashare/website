import type {Metadata} from 'next'
import {CartPageClient} from '@/components/cart/CartPageClient'
import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

export const metadata: Metadata = {
  title: 'Panier | Segna',
  description: 'Ton panier Segna — abonnement SegnaX, location ponctuelle ou achat.',
}

export const revalidate = 86400

export default async function PanierPage() {
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <>
      <SiteNavChrome header={headerNav} mobileNavId="mobile-nav-panier" surface="light" />
      <CartPageClient />
    </>
  )
}

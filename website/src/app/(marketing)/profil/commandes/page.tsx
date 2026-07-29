import type {Metadata} from 'next'
import {Suspense} from 'react'
import {OrdersPageClient} from '@/components/orders/OrdersPageClient'
import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

export const metadata: Metadata = {
  title: 'Commandes & retours | Segna',
  description: 'Suis tes commandes en cours, ton historique et tes retours Segna.',
}

export const revalidate = 86400

export default async function ProfilCommandesPage() {
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <>
      <SiteNavChrome header={headerNav} mobileNavId="mobile-nav-profil-commandes" surface="light" />
      <Suspense fallback={<WebsitePageLoading label="Chargement des commandes" />}>
        <OrdersPageClient />
      </Suspense>
    </>
  )
}

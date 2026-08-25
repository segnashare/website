import type {Metadata} from 'next'
import {Suspense} from 'react'
import {OrderDetailPageClient} from '@/components/orders/OrderDetailPageClient'
import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

type PageProps = {
  params: Promise<{cartId: string}>
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {cartId} = await params
  const compact = cartId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return {
    title: `Commande ${compact} | Segna`,
    description: 'Suivi, livraison et facture de ta commande Segna.',
  }
}

export const revalidate = 0

export default async function ProfilCommandeDetailPage({params}: PageProps) {
  const {cartId} = await params
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <>
      <SiteNavChrome
        header={headerNav}
        mobileNavId="mobile-nav-profil-commande-detail"
        surface="light"
      />
      <Suspense fallback={<WebsitePageLoading label="Chargement de la commande" />}>
        <OrderDetailPageClient cartId={cartId} />
      </Suspense>
    </>
  )
}

import type {Metadata} from 'next'
import {PurchaseCheckoutClient} from '@/components/cart/PurchaseCheckoutClient'
import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

export const metadata: Metadata = {
  title: 'Finaliser ma commande | Segna',
  description: 'Adresse de livraison et récapitulatif pour finaliser ton achat Segna.',
}

export const revalidate = 86400

export default async function CartCheckoutPage() {
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <>
      <SiteNavChrome header={headerNav} mobileNavId="mobile-nav-panier-checkout" surface="light" />
      <PurchaseCheckoutClient />
    </>
  )
}

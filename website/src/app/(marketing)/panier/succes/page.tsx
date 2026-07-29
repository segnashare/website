import {PurchaseSuccessClient} from '@/components/cart/PurchaseSuccessClient'
import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {getWebsiteHeaderNav} from '@/lib/sanity'
import {Suspense} from 'react'

export const metadata = {
  title: 'Commande confirmée | Segna',
}

export default async function PurchaseSuccessPage() {
  const header = await getWebsiteHeaderNav()
  return (
    <>
      <SiteNavChrome header={header} mobileNavId="purchase-success-mobile-nav" surface="light" />
      <Suspense fallback={<WebsitePageLoading label="Confirmation du paiement" />}>
        <PurchaseSuccessClient />
      </Suspense>
    </>
  )
}

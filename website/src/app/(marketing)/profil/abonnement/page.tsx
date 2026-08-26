import type {Metadata} from 'next'
import {Suspense} from 'react'
import {AbonnementPageClient} from '@/components/auth/AbonnementPageClient'
import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {RECAP_WALL_ITEMS} from '@/lib/subscription/recap-wall-items'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

export const metadata: Metadata = {
  title: 'Abonnement SegnaX | Segna',
  description: 'Gère ton abonnement SegnaX ou découvre les avantages membres.',
}

export const revalidate = 86400

export default async function ProfilAbonnementPage() {
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <>
      <SiteNavChrome header={headerNav} mobileNavId="mobile-nav-profil-abonnement" surface="light" />
      <Suspense fallback={<WebsitePageLoading label="Chargement de l’abonnement" />}>
        <AbonnementPageClient wallItems={RECAP_WALL_ITEMS} />
      </Suspense>
    </>
  )
}

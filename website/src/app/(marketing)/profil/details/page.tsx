import type {Metadata} from 'next'
import {Suspense} from 'react'
import {DetailsSecurityPageClient} from '@/components/auth/DetailsSecurityPageClient'
import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

export const metadata: Metadata = {
  title: 'Détails et sécurité | Segna',
  description: 'Gère tes informations personnelles, ton mot de passe et la suppression de ton compte.',
}

export const revalidate = 86400

export default async function ProfilDetailsPage() {
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <>
      <SiteNavChrome header={headerNav} mobileNavId="mobile-nav-profil-details" surface="light" />
      <Suspense fallback={<WebsitePageLoading label="Chargement des détails" />}>
        <DetailsSecurityPageClient />
      </Suspense>
    </>
  )
}

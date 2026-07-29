import type {Metadata} from 'next'
import {Suspense} from 'react'
import {ProfilePageClient} from '@/components/auth/ProfilePageClient'
import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

export const metadata: Metadata = {
  title: 'Mon profil | Segna',
  description: 'Gère ton abonnement, tes commandes, tes crédits et les infos de ton compte Segna.',
}

export const revalidate = 86400

export default async function ProfilPage() {
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <>
      <SiteNavChrome header={headerNav} mobileNavId="mobile-nav-profil" surface="light" />
      <Suspense fallback={<WebsitePageLoading label="Chargement du profil" />}>
        <ProfilePageClient />
      </Suspense>
    </>
  )
}

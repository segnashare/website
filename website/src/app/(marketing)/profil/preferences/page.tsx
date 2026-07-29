import type {Metadata} from 'next'
import {Suspense} from 'react'
import {PreferencesPageClient} from '@/components/auth/PreferencesPageClient'
import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {getHomePageData, getWebsiteHeaderNav} from '@/lib/sanity'

export const metadata: Metadata = {
  title: 'Préférences et communications | Segna',
  description: 'Gère tes notifications SMS et e-mail, ton téléphone et ton adresse e-mail.',
}

export const revalidate = 86400

export default async function ProfilPreferencesPage() {
  const [homePage, siteNavFallback] = await Promise.all([getHomePageData(), getWebsiteHeaderNav()])
  const headerNav = homePage ?? siteNavFallback

  return (
    <>
      <SiteNavChrome header={headerNav} mobileNavId="mobile-nav-profil-preferences" surface="light" />
      <Suspense fallback={<WebsitePageLoading label="Chargement des préférences" />}>
        <PreferencesPageClient />
      </Suspense>
    </>
  )
}

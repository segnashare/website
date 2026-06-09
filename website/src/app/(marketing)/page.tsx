import {CMS_ISR_REVALIDATE_SEC} from '@/lib/sanity-cache'
import type {Metadata} from 'next'
import {PageSections} from '@/components/cms/PageSections'
import {homeCatalogSearchNavFromFacets} from '@/lib/catalog/home-catalog-search-nav'
import {fetchMarketingCatalogPathResolveNav} from '@/lib/catalog/marketing-catalog-items'
import {heroTitlePlainText} from '@/lib/hero-title'
import {getHomePageData, urlFor} from '@/lib/sanity'
import {HomeHero} from '@/components/home/HomeHero'
import {HomeStagedHero} from '@/components/home/HomeStagedHero'
import styles from '@/components/home/homeHero.module.css'

export const revalidate = CMS_ISR_REVALIDATE_SEC

/** SEO accueil : champs `seo` du document « Page d’accueil » dans Sanity, sinon repli sur le sous-titre hero. */
export async function generateMetadata(): Promise<Metadata> {
  const homePage = await getHomePageData()
  if (!homePage) {
    return {title: 'Segna'}
  }
  const titleBase = homePage.seo?.metaTitle?.trim() || heroTitlePlainText(homePage.heroTitle)
  const description =
    homePage.seo?.metaDescription?.trim() || homePage.heroSubtitle?.trim() || undefined
  const share = homePage.seo?.shareImage
  const ogImage =
    share?.asset && (share.asset._ref || share.asset.url)
      ? urlFor(share).width(1200).height(630).fit('crop').url()
      : undefined
  return {
    title: `${titleBase} | Segna`,
    description,
    openGraph: ogImage ? {images: [{url: ogImage}]} : undefined,
  }
}

export default async function HomePage() {
  const [homePage, catalogPathNav] = await Promise.all([
    getHomePageData(),
    fetchMarketingCatalogPathResolveNav(),
  ])
  const catalogSearchNav = homeCatalogSearchNavFromFacets(catalogPathNav)

  if (!homePage) {
    return (
      <main className={styles.fallback}>
        <h1>Home page non configuree</h1>
        <p>Creer un document "Page d’accueil" dans Sanity Studio pour alimenter cette page.</p>
      </main>
    )
  }

  const useStagedHero =
    homePage.heroPresentation === 'multi_state' &&
    Array.isArray(homePage.heroStates) &&
    homePage.heroStates.length > 0

  const backgroundImageUrl = homePage.heroImage?.asset
    ? urlFor(homePage.heroImage).width(2200).height(1400).fit('crop').url()
    : undefined

  return (
    <main>
      {useStagedHero ? (
        <HomeStagedHero homePage={homePage} catalogSearchNav={catalogSearchNav} />
      ) : (
        <HomeHero homePage={homePage} backgroundImageUrl={backgroundImageUrl} catalogSearchNav={catalogSearchNav} />
      )}
      <PageSections sections={homePage.sections} afterFullBleedHero />
    </main>
  )
}

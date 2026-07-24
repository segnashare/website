import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {PageSections} from '@/components/cms/PageSections'
import {MarketingFullBleedHero} from '@/components/layout/MarketingFullBleedHero'
import {heroTitlePlainText} from '@/lib/hero-title'
import {getHomePageData, getMarketingPageBySlug, getMarketingPageSlugs, getWebsiteHeaderNav, urlFor} from '@/lib/sanity'

export const revalidate = 3600

type PageProps = {
  params: Promise<{slug: string}>
}

export async function generateStaticParams() {
  const slugs = await getMarketingPageSlugs()
  /** Routes app dédiées (hors CMS dynamique). */
  const reserved = new Set(['catalogue', 'panier', 'abonnement', 'signup', 'signin'])
  return slugs.filter((slug) => !reserved.has(slug)).map((slug) => ({slug}))
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {slug} = await params
  const page = await getMarketingPageBySlug(slug)
  if (!page) return {title: 'Page introuvable'}
  const title = page.seo?.metaTitle?.trim() || heroTitlePlainText(page.heroTitle)
  const description = page.seo?.metaDescription?.trim() || page.heroSubtitle?.trim() || undefined
  const share = page.seo?.shareImage
  const ogImage =
    share?.asset && (share.asset._ref || share.asset.url)
      ? urlFor(share).width(1200).height(630).fit('crop').url()
      : undefined
  return {
    title: `${title} | Segna`,
    description,
    openGraph: ogImage ? {images: [{url: ogImage}]} : undefined,
  }
}

export default async function MarketingDynamicPage({params}: PageProps) {
  const {slug} = await params
  const [marketingPage, homePage, siteNavFallback] = await Promise.all([
    getMarketingPageBySlug(slug),
    getHomePageData(),
    getWebsiteHeaderNav(),
  ])

  if (!marketingPage) notFound()

  const headerNav = homePage ?? siteNavFallback

  const customCta =
    marketingPage.heroCtaLabel?.trim() && marketingPage.heroCtaHref?.trim()
      ? {label: marketingPage.heroCtaLabel.trim(), href: marketingPage.heroCtaHref.trim()}
      : null

  const primary = homePage?.primaryCta ?? siteNavFallback?.primaryCta
  const fallbackCta =
    primary?.label?.trim() && primary?.url?.trim()
      ? {label: primary.label.trim(), href: primary.url.trim()}
      : {label: 'Découvrir Segna', href: '/'}

  const cta = customCta ?? fallbackCta

  return (
    <MarketingFullBleedHero marketing={marketingPage} headerNav={headerNav} cta={cta}>
      {/* Pas de `.container` (1120px) : les sections gèrent déjà leurs gouttières / full-bleed
          (comme l’accueil). Sinon le shuffle 5 colonnes paraît trop serré sur grand écran. */}
      <PageSections sections={marketingPage.sections} afterFullBleedHero />
    </MarketingFullBleedHero>
  )
}

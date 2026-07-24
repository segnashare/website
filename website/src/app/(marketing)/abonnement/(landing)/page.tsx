import type {Metadata} from 'next'
import {SubscriptionLandingClient} from '@/components/subscription/SubscriptionLandingClient'
import {getAbonnementMarketingShell} from '@/lib/subscription/abonnement-marketing-shell'
import {heroTitlePlainText} from '@/lib/hero-title'
import {urlFor} from '@/lib/sanity'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const {marketingPage, fromCms} = await getAbonnementMarketingShell()
  const title =
    marketingPage.seo?.metaTitle?.trim() ||
    (fromCms ? heroTitlePlainText(marketingPage.heroTitle) : 'Abonnement SegnaX')
  const description =
    marketingPage.seo?.metaDescription?.trim() ||
    marketingPage.heroSubtitle?.trim() ||
    'Loue avec SegnaX : 1er mois offert, puis 39,99 €/mois. Jusqu’à 400 € de pièces, échanges et assurance inclus.'
  const share = marketingPage.seo?.shareImage
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

export default function AbonnementPage() {
  return <SubscriptionLandingClient />
}

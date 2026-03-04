import {createClient} from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '1qxhnoe8'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === 'production',
})

const builder = imageUrlBuilder(sanityClient)

type SanityImageSource = Parameters<typeof builder.image>[0]

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

export type SanityImage = {
  asset?: {
    _ref?: string
    _type?: string
  }
  alt?: string
}

export type NavItem = {
  _key: string
  label: string
  href?: string
}

export type HomeSection = {
  _key: string
  title: string
  text: string
  image?: SanityImage
}

export type HomePageData = {
  brandName?: string
  heroTitle: string
  heroSubtitle?: string
  heroImage?: SanityImage
  primaryCta?: {
    label: string
    url: string
  }
  navItems?: NavItem[]
  sections?: HomeSection[]
  mobileMenuContact?: {
    label: string
    href?: string
  }
  mobileMenuSocialLinks?: Array<{
    _key: string
    label: string
    href: string
  }>
}

export type PostData = {
  _id: string
  title: string
  slug?: {
    current?: string
  }
  publishedAt?: string
  image?: SanityImage
}

export type NewsroomPageData = {
  heroTitle: string
  heroSubtitle: string
  heroImage?: SanityImage
  introText: string
  highlightedPost?: PostData
}

export async function getHomePageData(): Promise<HomePageData | null> {
  return sanityClient.fetch(
    `*[_type == "homePage"]|order(_updatedAt desc)[0]{
      brandName,
      heroTitle,
      heroSubtitle,
      heroImage{
        ...,
        alt
      },
      primaryCta,
      navItems[]{
        _key,
        label,
        href
      },
      mobileMenuContact{
        label,
        href
      },
      mobileMenuSocialLinks[]{
        _key,
        label,
        href
      },
      sections[]{
        _key,
        title,
        text,
        image{
          ...,
          alt
        }
      }
    }`
  )
}

export async function getNewsroomPageData(): Promise<NewsroomPageData | null> {
  return sanityClient.fetch(
    `*[_type == "newsroomPage"]|order(_updatedAt desc)[0]{
      heroTitle,
      heroSubtitle,
      heroImage{
        ...,
        alt
      },
      introText,
      highlightedPost->{
        _id,
        title,
        slug,
        publishedAt,
        image{
          ...,
          alt
        }
      }
    }`
  )
}

export async function getPosts(): Promise<PostData[]> {
  return sanityClient.fetch(
    `*[_type == "post"]|order(publishedAt desc){
      _id,
      title,
      slug,
      publishedAt,
      image{
        ...,
        alt
      }
    }`
  )
}

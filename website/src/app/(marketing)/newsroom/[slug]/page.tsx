import type {Metadata} from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {PortableRichText} from '@/components/cms/PortableRichText'
import {CtaHrefLink} from '@/components/home/heroShared'
import {catalogAppSignupHref} from '@/lib/catalog/catalog-app-links'
import {objectPositionFromHotspot} from '@/lib/homeStagedPlacements'
import {getPostBySlug, getPostSlugs, urlFor} from '@/lib/sanity'
import styles from './post.module.css'

export const revalidate = 3600

type Props = {
  params: Promise<{slug: string}>
}

export async function generateStaticParams() {
  const slugs = await getPostSlugs()
  return slugs.map((slug) => ({slug}))
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const post = await getPostBySlug(slug)
  if (!post) return {title: 'Article introuvable', robots: {index: false, follow: false}}
  const title = post.seo?.metaTitle?.trim() || post.title
  const description = post.seo?.metaDescription?.trim() || post.excerpt?.trim() || undefined
  const share = post.seo?.shareImage ?? post.image
  const ogImage =
    share?.asset && (share.asset._ref || share.asset.url)
      ? urlFor(share).width(1200).height(630).fit('crop').url()
      : undefined
  const path = `/newsroom/${slug}`
  return {
    title: `${title} | Segna`,
    description,
    alternates: {canonical: path},
    openGraph: {
      title: `${title} | Segna`,
      description,
      url: path,
      type: 'article',
      ...(ogImage ? {images: [{url: ogImage}]} : {}),
    },
  }
}

export default async function NewsroomPostPage({params}: Props) {
  const {slug} = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const author = post.author?.name?.trim()
  const imageUrl =
    post.image?.asset && (post.image.asset._ref || post.image.asset.url)
      ? urlFor(post.image).width(1800).height(1125).fit('crop').auto('format').url()
      : null
  const objectPosition = objectPositionFromHotspot(post.image?.hotspot)
  const hasBody = Array.isArray(post.body) && post.body.length > 0
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.segnashare.com').replace(/\/+$/, '')
  const pageUrl = `${siteUrl}/newsroom/${slug}`
  const share = post.seo?.shareImage ?? post.image
  const shareUrl =
    share?.asset && (share.asset._ref || share.asset.url)
      ? urlFor(share).width(1200).height(630).fit('crop').url()
      : imageUrl
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seo?.metaDescription?.trim() || post.excerpt?.trim() || undefined,
    image: shareUrl ? [shareUrl] : undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.publishedAt || undefined,
    author: author
      ? {'@type': 'Person', name: author}
      : {'@type': 'Organization', name: 'Segna'},
    publisher: {
      '@type': 'Organization',
      name: 'Segna',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/segna-icon.png`,
      },
    },
    mainEntityOfPage: {'@type': 'WebPage', '@id': pageUrl},
  }

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
      />
      <div className={styles.hero} aria-hidden={!imageUrl}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.image?.alt?.trim() || post.title}
            fill
            priority
            sizes="(max-width: 48rem) 100vw, min(72rem, 92vw)"
            className={styles.heroImage}
            style={{
              objectFit: 'cover',
              ...(objectPosition ? {objectPosition} : {}),
            }}
          />
        ) : (
          <span className={styles.heroPlaceholder}>Image</span>
        )}
      </div>

      <div className={styles.copy}>
        {author ? <p className={styles.byline}>Par {author}</p> : null}
        <h1 className={styles.title}>{post.title}</h1>
        {hasBody ? (
          <div className={styles.body}>
            <PortableRichText value={post.body!} variant="article" />
          </div>
        ) : null}

        <div className={styles.ctas}>
          <Link href="/catalogue" className={styles.ctaSecondary}>
            Voir le catalogue
          </Link>
          <CtaHrefLink href={catalogAppSignupHref()} className={styles.ctaPrimary}>
            Rejoindre Segna
          </CtaHrefLink>
        </div>
      </div>
    </main>
  )
}

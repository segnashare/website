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
  if (!post) return {title: 'Article introuvable'}
  const title = post.seo?.metaTitle?.trim() || post.title
  const description = post.seo?.metaDescription?.trim() || post.excerpt?.trim() || undefined
  const share = post.seo?.shareImage ?? post.image
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

  return (
    <main className={styles.page}>
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

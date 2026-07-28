import type {Metadata} from 'next'
import {Suspense} from 'react'
import {PageSections} from '@/components/cms/PageSections'
import {NewsroomBrowse} from '@/components/newsroom/NewsroomBrowse'
import {getNewsroomMarketingShell} from '@/lib/newsroom-marketing-shell'
import {getPosts, urlFor} from '@/lib/sanity'
import styles from '../newsroom.module.css'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const {marketing} = await getNewsroomMarketingShell()
  const title = marketing.seo?.metaTitle?.trim() || marketing.heroTitle?.trim() || 'Newsroom'
  const description =
    marketing.seo?.metaDescription?.trim() || marketing.heroSubtitle?.trim() || undefined
  const share = marketing.seo?.shareImage
  const ogImage =
    share?.asset && (share.asset._ref || share.asset.url)
      ? urlFor(share).width(1200).height(630).fit('crop').url()
      : undefined
  return {
    title: `${title} | Segna`,
    description,
    alternates: {canonical: '/newsroom'},
    openGraph: {
      title: `${title} | Segna`,
      description,
      url: '/newsroom',
      type: 'website',
      ...(ogImage ? {images: [{url: ogImage}]} : {}),
    },
  }
}

export default async function NewsroomPage() {
  const [{sections, introText}, posts] = await Promise.all([
    getNewsroomMarketingShell(),
    getPosts(),
  ])

  return (
    <div className={styles.page}>
      {introText ? <p className={styles.intro}>{introText}</p> : null}

      {sections.length > 0 ? (
        <div className={styles.sections}>
          <PageSections sections={sections} afterFullBleedHero />
        </div>
      ) : null}

      <Suspense fallback={<p className={styles.empty}>Chargement…</p>}>
        <NewsroomBrowse posts={posts} />
      </Suspense>
    </div>
  )
}

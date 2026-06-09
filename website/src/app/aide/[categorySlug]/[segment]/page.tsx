import {CMS_ISR_REVALIDATE_SEC} from '@/lib/sanity-cache'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {HelpArticleContent} from '@/components/help/HelpArticleContent'
import {HelpBreadcrumbs} from '@/components/help/HelpBreadcrumbs'
import styles from '@/components/help/help.module.css'
import {
  getHelpCenterSettings,
  getHelpRootArticleBySlugs,
  getHelpSubsectionBySlugs,
} from '@/lib/sanity-help'

export const revalidate = CMS_ISR_REVALIDATE_SEC

type PageProps = {
  params: Promise<{categorySlug: string; segment: string}>
}

export async function generateMetadata({params}: PageProps) {
  const {categorySlug, segment} = await params
  const subsection = await getHelpSubsectionBySlugs(categorySlug, segment)
  if (subsection) return {title: `${subsection.title} | Centre d’aide Segna`}
  const article = await getHelpRootArticleBySlugs(categorySlug, segment)
  if (article) return {title: `${article.title} | Centre d’aide Segna`}
  return {title: 'Page introuvable'}
}

export default async function HelpSegmentPage({params}: PageProps) {
  const {categorySlug, segment} = await params
  const [settings, subsection, article] = await Promise.all([
    getHelpCenterSettings(),
    getHelpSubsectionBySlugs(categorySlug, segment),
    getHelpRootArticleBySlugs(categorySlug, segment),
  ])

  const brand = settings?.headerBrandLabel ?? 'Segna'

  if (subsection) {
    const catTitle = subsection.category?.title ?? 'Section'
    return (
      <main className={styles.main}>
        <HelpBreadcrumbs
          items={[
            {label: brand, href: '/aide'},
            {label: catTitle, href: `/aide/${categorySlug}`},
            {label: subsection.title},
          ]}
        />
        <h1 className={styles.pageTitle}>{subsection.title}</h1>
        {subsection.articles.length === 0 ? (
          <p className={styles.emptyState}>
            Cette sous-section ne contient pas encore d’articles. Ajoutez des documents « Aide — article » liés à cette
            sous-section dans Sanity.
          </p>
        ) : (
          <ul className={styles.articleList} style={{borderTop: '1px solid var(--help-border, #e8e8e8)'}}>
            {subsection.articles.map((art) => {
              const artSlug = art.slug?.current
              if (!artSlug) return null
              return (
                <li key={art._id} className={styles.articleRow}>
                  <Link href={`/aide/${categorySlug}/${segment}/${artSlug}`}>
                    {art.isFeatured ? (
                      <span className={styles.featuredStar} aria-hidden>
                        ★
                      </span>
                    ) : null}
                    <span>{art.title}</span>
                  </Link>
                  <span className={styles.chevron} aria-hidden>
                    ›
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    )
  }

  if (article) {
    const catTitle = article.category?.title ?? 'Section'
    return (
      <HelpArticleContent
        article={article}
        breadcrumbItems={[
          {label: brand, href: '/aide'},
          {label: catTitle, href: `/aide/${categorySlug}`},
          {label: article.title},
        ]}
        backHref={`/aide/${categorySlug}`}
        backLabel={`← Tous les articles : ${catTitle}`}
      />
    )
  }

  notFound()
}

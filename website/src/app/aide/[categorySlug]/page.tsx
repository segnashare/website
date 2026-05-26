import Link from 'next/link'
import {notFound} from 'next/navigation'
import {HelpBreadcrumbs} from '@/components/help/HelpBreadcrumbs'
import styles from '@/components/help/help.module.css'
import {getHelpCategoryBySlug, getHelpCenterSettings} from '@/lib/sanity-help'

export const revalidate = 3600

type PageProps = {
  params: Promise<{categorySlug: string}>
}

export async function generateMetadata({params}: PageProps) {
  const {categorySlug} = await params
  const category = await getHelpCategoryBySlug(categorySlug)
  if (!category) return {title: 'Section introuvable'}
  return {title: `${category.title} | Centre d’aide Segna`}
}

export default async function HelpCategoryPage({params}: PageProps) {
  const {categorySlug} = await params
  const [settings, category] = await Promise.all([getHelpCenterSettings(), getHelpCategoryBySlug(categorySlug)])

  if (!category) notFound()

  const brand = settings?.headerBrandLabel ?? 'Segna'
  const sections = category.sections ?? []
  const rootArticles = category.rootArticles ?? []
  const hasSubsections = sections.length > 0
  const hasRootArticles = rootArticles.length > 0

  return (
    <main className={styles.main}>
      <HelpBreadcrumbs
        items={[
          {label: brand, href: '/aide'},
          {label: category.title},
        ]}
      />
      <h1 className={styles.pageTitle}>{category.title}</h1>

      {!hasSubsections && !hasRootArticles ? (
        <p className={styles.emptyState}>
          Cette section ne contient pas encore de sous-sections ni d’articles. Ajoutez des documents dans Sanity
          Studio (Aide — sous-section et Aide — article).
        </p>
      ) : null}

      {hasSubsections ? (
        <>
          <h2 className={styles.subsectionHeading}>Sous-sections</h2>
          <ul className={styles.articleList} style={{borderTop: '1px solid var(--help-border, #e8e8e8)'}}>
            {sections.map((sec) => {
              const secSlug = sec.slug?.current
              if (!secSlug) return null
              return (
                <li key={sec._id} className={styles.articleRow}>
                  <Link href={`/aide/${categorySlug}/${secSlug}`}>
                    <span>{sec.title}</span>
                  </Link>
                  <span className={styles.chevron} aria-hidden>
                    ›
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}

      {hasRootArticles ? (
        <>
          {hasSubsections ? (
            <h2 className={styles.subsectionHeading}>Articles</h2>
          ) : null}
          <ul
            className={styles.articleList}
            style={{
              borderTop: hasSubsections ? undefined : '1px solid var(--help-border, #e8e8e8)',
            }}
          >
            {rootArticles.map((article) => {
              const artSlug = article.slug?.current
              if (!artSlug) return null
              return (
                <li key={article._id} className={styles.articleRow}>
                  <Link href={`/aide/${categorySlug}/${artSlug}`}>
                    {article.isFeatured ? (
                      <span className={styles.featuredStar} aria-hidden>
                        ★
                      </span>
                    ) : null}
                    <span>{article.title}</span>
                  </Link>
                  <span className={styles.chevron} aria-hidden>
                    ›
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </main>
  )
}

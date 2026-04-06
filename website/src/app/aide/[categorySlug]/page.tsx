import Link from 'next/link'
import {notFound} from 'next/navigation'
import {HelpBreadcrumbs} from '@/components/help/HelpBreadcrumbs'
import styles from '@/components/help/help.module.css'
import {getHelpCategoryBySlug, getHelpCenterSettings} from '@/lib/sanity-help'

export const revalidate = 60

type PageProps = {
  params: Promise<{categorySlug: string}>
}

export async function generateMetadata({params}: PageProps) {
  const {categorySlug} = await params
  const category = await getHelpCategoryBySlug(categorySlug)
  if (!category) return {title: 'Catégorie introuvable'}
  return {title: `${category.title} | Centre d’aide Segna`}
}

export default async function HelpCategoryPage({params}: PageProps) {
  const {categorySlug} = await params
  const [settings, category] = await Promise.all([getHelpCenterSettings(), getHelpCategoryBySlug(categorySlug)])

  if (!category) notFound()

  const brand = settings?.headerBrandLabel ?? 'Segna'

  return (
    <main className={styles.main}>
      <HelpBreadcrumbs
        items={[
          {label: brand, href: '/aide'},
          {label: category.title},
        ]}
      />
      <h1 className={styles.pageTitle}>{category.title}</h1>

      {category.articles.length === 0 ? (
        <p className={styles.emptyState}>
          Cette catégorie ne contient pas encore d’articles. Ajoutez des documents « Aide — article » liés à cette
          catégorie dans Sanity.
        </p>
      ) : (
        <ul className={styles.articleList} style={{borderTop: '1px solid var(--help-border, #e8e8e8)'}}>
          {category.articles.map((article) => {
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
      )}
    </main>
  )
}

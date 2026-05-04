import Link from 'next/link'
import {HelpBreadcrumbs} from '@/components/help/HelpBreadcrumbs'
import {HelpPortableText} from '@/components/help/HelpPortableText'
import {FaqAccordion} from '@/components/page-sections/FaqAccordion'
import styles from '@/components/help/help.module.css'
import type {HelpArticlePageData} from '@/lib/sanity-help'

function formatDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('fr-FR', {dateStyle: 'long'}).format(date)
}

type HelpArticleContentProps = {
  article: HelpArticlePageData
  /** Lien « retour » (liste des articles du niveau courant) */
  backHref: string
  backLabel: string
  breadcrumbItems: {label: string; href?: string}[]
}

export function HelpArticleContent({article, backHref, backLabel, breadcrumbItems}: HelpArticleContentProps) {
  const updated = formatDate(article.lastUpdated)

  return (
    <main className={styles.main}>
      <HelpBreadcrumbs items={breadcrumbItems} />
      <article>
        <h1 className={styles.articlePageTitle}>{article.title}</h1>
        {updated ? <p className={styles.lastUpdated}>Dernière mise à jour : {updated}</p> : null}
        <HelpPortableText value={article.body as unknown[] | undefined} />
        <FaqAccordion items={article.qaItems} />
      </article>

      <p style={{marginTop: '2.5rem', fontSize: '0.9rem'}}>
        <Link href={backHref}>{backLabel}</Link>
      </p>
    </main>
  )
}

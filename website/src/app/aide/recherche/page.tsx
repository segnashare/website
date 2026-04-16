import Link from 'next/link'
import {HelpBreadcrumbs} from '@/components/help/HelpBreadcrumbs'
import styles from '@/components/help/help.module.css'
import {getHelpCenterSettings, helpArticleHref, searchHelpArticles} from '@/lib/sanity-help'

export const revalidate = 60

type PageProps = {
  searchParams: Promise<{q?: string}>
}

export async function generateMetadata({searchParams}: PageProps) {
  const {q} = await searchParams
  const settings = await getHelpCenterSettings()
  const base = settings?.searchResultsTitle ?? 'Résultats de recherche'
  const title = q?.trim() ? `${base} « ${q.trim()} »` : base
  return {title: `${title} | Segna`}
}

export default async function HelpSearchPage({searchParams}: PageProps) {
  const {q = ''} = await searchParams
  const [settings, hits] = await Promise.all([getHelpCenterSettings(), searchHelpArticles(q)])

  const brand = settings?.headerBrandLabel ?? 'Segna'
  const pageTitle = settings?.searchResultsTitle ?? 'Résultats de recherche'
  const trimmed = q.trim()

  return (
    <main className={styles.main}>
      <HelpBreadcrumbs
        items={[
          {label: brand, href: '/aide'},
          {label: pageTitle},
        ]}
      />
      <h1 className={styles.pageTitle}>{pageTitle}</h1>
      {trimmed ? (
        <p className={styles.searchMeta}>
          {hits.length} résultat{hits.length !== 1 ? 's' : ''} pour « {trimmed} »
        </p>
      ) : (
        <p className={styles.searchMeta}>Saisissez au moins 2 caractères dans la barre de recherche.</p>
      )}

      {trimmed && hits.length === 0 ? (
        <p className={styles.emptyState}>Aucun article ne correspond à votre recherche.</p>
      ) : null}

      <div>
        {hits.map((hit) => {
          const href = helpArticleHref(hit)
          if (!href) return null
          return (
            <div key={hit._id} className={styles.resultRow}>
              <Link href={href} className={styles.resultTitle}>
                {hit.title}
              </Link>
              {hit.excerpt ? <p className={styles.resultExcerpt}>{hit.excerpt}</p> : null}
            </div>
          )
        })}
      </div>
    </main>
  )
}

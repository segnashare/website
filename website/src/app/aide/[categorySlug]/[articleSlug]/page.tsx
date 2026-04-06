import Link from 'next/link'
import {notFound} from 'next/navigation'
import {HelpBreadcrumbs} from '@/components/help/HelpBreadcrumbs'
import {HelpPortableText} from '@/components/help/HelpPortableText'
import styles from '@/components/help/help.module.css'
import {getHelpArticleBySlugs, getHelpCenterSettings} from '@/lib/sanity-help'

export const revalidate = 60

type PageProps = {
  params: Promise<{categorySlug: string; articleSlug: string}>
}

function formatDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('fr-FR', {dateStyle: 'long'}).format(date)
}

export async function generateMetadata({params}: PageProps) {
  const {categorySlug, articleSlug} = await params
  const article = await getHelpArticleBySlugs(categorySlug, articleSlug)
  if (!article) return {title: 'Article introuvable'}
  return {title: `${article.title} | Centre d’aide Segna`}
}

export default async function HelpArticlePage({params}: PageProps) {
  const {categorySlug, articleSlug} = await params
  const [settings, article] = await Promise.all([
    getHelpCenterSettings(),
    getHelpArticleBySlugs(categorySlug, articleSlug),
  ])

  if (!article) notFound()

  const brand = settings?.headerBrandLabel ?? 'Segna'
  const catTitle = article.category?.title ?? 'Catégorie'

  const updated = formatDate(article.lastUpdated)

  return (
    <main className={styles.main}>
      <HelpBreadcrumbs
        items={[
          {label: brand, href: '/aide'},
          {label: catTitle, href: `/aide/${categorySlug}`},
          {label: article.title},
        ]}
      />
      <article>
        <h1 className={styles.articlePageTitle}>{article.title}</h1>
        {updated ? <p className={styles.lastUpdated}>Dernière mise à jour : {updated}</p> : null}
        <HelpPortableText value={article.body as unknown[] | undefined} />
      </article>

      <p style={{marginTop: '2.5rem', fontSize: '0.9rem'}}>
        <Link href={`/aide/${categorySlug}`}>← Tous les articles : {catTitle}</Link>
      </p>
    </main>
  )
}

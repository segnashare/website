import {notFound} from 'next/navigation'
import {HelpArticleContent} from '@/components/help/HelpArticleContent'
import {getHelpCenterSettings, getHelpNestedArticleBySlugs} from '@/lib/sanity-help'

export const revalidate = 3600

type PageProps = {
  params: Promise<{categorySlug: string; segment: string; articleSlug: string}>
}

export async function generateMetadata({params}: PageProps) {
  const {categorySlug, segment, articleSlug} = await params
  const article = await getHelpNestedArticleBySlugs(categorySlug, segment, articleSlug)
  if (!article) return {title: 'Article introuvable'}
  return {title: `${article.title} | Centre d’aide Segna`}
}

export default async function HelpNestedArticlePage({params}: PageProps) {
  const {categorySlug, segment, articleSlug} = await params
  const [settings, article] = await Promise.all([
    getHelpCenterSettings(),
    getHelpNestedArticleBySlugs(categorySlug, segment, articleSlug),
  ])

  if (!article) notFound()

  const brand = settings?.headerBrandLabel ?? 'Segna'
  const catTitle = article.category?.title ?? 'Section'
  const subTitle = article.section?.title ?? 'Sous-section'

  return (
    <HelpArticleContent
      article={article}
      breadcrumbItems={[
        {label: brand, href: '/aide'},
        {label: catTitle, href: `/aide/${categorySlug}`},
        {label: subTitle, href: `/aide/${categorySlug}/${segment}`},
        {label: article.title},
      ]}
      backHref={`/aide/${categorySlug}/${segment}`}
      backLabel={`← Tous les articles : ${subTitle}`}
    />
  )
}

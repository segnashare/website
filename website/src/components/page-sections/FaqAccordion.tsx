import type {PortableTextBlock} from '@portabletext/types'
import Link from 'next/link'
import {PortableRichText} from '@/components/cms/PortableRichText'
import type {HelpArticleFaqBundle, HelpArticleQaItem, HelpFaqItem} from '@/lib/sanity'
import {helpArticleHrefFromSlugs} from '@/lib/sanity-help'
import styles from './faqAccordion.module.css'

type FaqAccordionSource = HelpFaqItem[] | HelpArticleQaItem[] | HelpArticleFaqBundle[] | null | undefined

function normalizeFaqItems(source: FaqAccordionSource): HelpFaqItem[] {
  if (!source?.length) return []
  const head = source[0]
  if (head && typeof head === 'object' && 'qaItems' in head) {
    return (source as HelpArticleFaqBundle[]).flatMap((art) => {
      const href = helpArticleHrefFromSlugs(art.categorySlug, art.sectionSlug, art.articleSlug)
      return (art.qaItems ?? [])
        .filter((q) => q.question?.trim() && Array.isArray(q.answer) && q.answer.length > 0)
        .map((q) => ({
          _key: `${art._id}-${q._key}`,
          question: q.question.trim(),
          answer: q.answer as PortableTextBlock[],
          helpArticleHref: href,
        }))
    })
  }
  return (source as (HelpFaqItem | HelpArticleQaItem)[]).map((row) => ({
    _key: row._key,
    question: row.question,
    answer: row.answer,
    helpArticleHref: 'helpArticleHref' in row ? row.helpArticleHref : undefined,
  }))
}

type Props = {
  items: FaqAccordionSource
  className?: string
  /** Dans une grille FAQ : pas de marge supérieure sur l’accordéon. */
  embedded?: boolean
}

function isFaqRenderable(
  it: HelpFaqItem,
): it is HelpFaqItem & {question: string; answer: PortableTextBlock[]} {
  return Boolean(it.question?.trim() && Array.isArray(it.answer) && it.answer.length > 0)
}

function isExternalHref(href: string) {
  const t = href.trim().toLowerCase()
  return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('//')
}

/** Accordéon Q/R (natif `<details>`), couleurs héritées du parent. */
export function FaqAccordion({items, className, embedded}: Props) {
  const list = normalizeFaqItems(items).filter(isFaqRenderable)
  if (!list.length) return null

  return (
    <div
      className={[styles.root, embedded ? styles.rootEmbedded : '', className].filter(Boolean).join(' ')}
      role="region"
      aria-label="Questions fréquentes"
    >
      {list.map((item) => (
        <details key={item._key} className={styles.item}>
          <summary className={styles.summary}>
            <span className={styles.question}>{item.question.trim()}</span>
            <span className={styles.chevron} aria-hidden />
          </summary>
          <div className={styles.answer}>
            <PortableRichText value={item.answer} className={styles.answerRich} />
            {item.helpArticleHref ? (
              <p className={styles.articleLinkWrap}>
                {isExternalHref(item.helpArticleHref) ? (
                  <a
                    href={item.helpArticleHref}
                    className={styles.articleLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Voir l’article
                  </a>
                ) : (
                  <Link href={item.helpArticleHref} className={styles.articleLink}>
                    Voir l’article
                  </Link>
                )}
              </p>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  )
}

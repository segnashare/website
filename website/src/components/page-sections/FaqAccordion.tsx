import type {PortableTextBlock} from '@portabletext/types'
import {PortableRichText} from '@/components/cms/PortableRichText'
import type {HelpFaqItem} from '@/lib/sanity'
import styles from './faqAccordion.module.css'

type Props = {
  items: HelpFaqItem[] | null | undefined
  className?: string
}

function isFaqRenderable(
  it: HelpFaqItem,
): it is HelpFaqItem & {question: string; answer: PortableTextBlock[]} {
  return Boolean(it.question?.trim() && Array.isArray(it.answer) && it.answer.length > 0)
}

/** Accordéon Q/R (natif `<details>`), couleurs héritées du parent. */
export function FaqAccordion({items, className}: Props) {
  const list = (items ?? []).filter(isFaqRenderable)
  if (!list.length) return null

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(' ')}
      role="region"
      aria-label="Questions fréquentes"
    >
      {list.map((item) => (
        <details key={item._id} className={styles.item}>
          <summary className={styles.summary}>
            <span className={styles.question}>{item.question.trim()}</span>
            <span className={styles.chevron} aria-hidden />
          </summary>
          <div className={styles.answer}>
            <PortableRichText value={item.answer} className={styles.answerRich} />
          </div>
        </details>
      ))}
    </div>
  )
}

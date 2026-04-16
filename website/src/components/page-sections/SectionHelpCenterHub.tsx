import Link from 'next/link'
import type {HelpCenterHubSection} from '@/lib/sanity'
import {getHelpCategoriesForHub} from '@/lib/sanity-help'
import styles from './helpCenterHub.module.css'

type Props = {
  section: HelpCenterHubSection
}

export async function SectionHelpCenterHub({section}: Props) {
  const categories = await getHelpCategoriesForHub()
  const seeAllLabel = section.helpHubCtaLabel?.trim() || 'Voir tout le centre d’aide'
  const seeAllHref = section.helpHubCtaHref?.trim() || '/aide'

  return (
    <section className={styles.wrap} aria-labelledby={`help-hub-${section._key}`}>
      <h2 id={`help-hub-${section._key}`} className={styles.title}>
        {section.hubTitle}
      </h2>
      {section.hubIntro?.trim() ? <p className={styles.intro}>{section.hubIntro.trim()}</p> : null}

      {categories.length === 0 ? (
        <p className={styles.note}>
          Aucune catégorie dans le centre d’aide pour le moment. L’arborescence complète reste sur{' '}
          <Link href="/aide">/aide</Link>.
        </p>
      ) : (
        <div className={styles.grid}>
          {categories.map((cat) => {
            const slug = cat.slug?.current
            if (!slug) return null
            return (
              <Link key={cat._id} href={`/aide/${slug}`} className={styles.card}>
                {cat.title}
              </Link>
            )
          })}
        </div>
      )}

      <div className={styles.footer}>
        <Link href={seeAllHref} className={styles.seeAll}>
          {seeAllLabel}
        </Link>
        {section.helpHubNote?.trim() ? <p className={styles.note}>{section.helpHubNote.trim()}</p> : null}
      </div>
    </section>
  )
}

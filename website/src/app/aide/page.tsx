import {CMS_ISR_REVALIDATE_SEC} from '@/lib/sanity-cache'
import Link from 'next/link'
import styles from '@/components/help/help.module.css'
import {getHelpCategoriesForHome, getHelpCenterSettings} from '@/lib/sanity-help'

export const revalidate = CMS_ISR_REVALIDATE_SEC

export default async function AideHomePage() {
  const [settings, categories] = await Promise.all([getHelpCenterSettings(), getHelpCategoriesForHome()])

  const heroTitle = settings?.landingHeroTitle ?? 'Bonjour, comment pouvons-nous vous aider ?'
  const heroSubtitle = settings?.landingHeroSubtitle
  const placeholder = settings?.searchPlaceholder ?? 'Rechercher'

  return (
    <main className={`${styles.main} ${styles.landingMain}`}>
      <div className={styles.landingHero}>
        <h1 className={styles.heroTitle}>{heroTitle}</h1>
        {heroSubtitle ? <p className={styles.heroSubtitle}>{heroSubtitle}</p> : null}

        <div className={styles.heroSearchWrap}>
          <form className={styles.heroSearchHinge} action="/aide/recherche" method="get" role="search">
            <button type="submit" className={styles.heroSearchIconBtn} aria-label="Lancer la recherche">
              <svg className={styles.heroSearchSvg} viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="10.5" cy="10.5" r="6.75" stroke="currentColor" strokeWidth="1.35" />
                <path d="M15.6 15.6 21 21" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
              </svg>
            </button>
            <input
              className={styles.heroSearchInput}
              type="search"
              name="q"
              placeholder={placeholder}
              autoComplete="off"
            />
          </form>
        </div>
      </div>

      {categories.length === 0 ? (
        <p className={styles.emptyState}>
          Aucune section pour le moment. Ajoutez des documents « Aide — section » dans Sanity Studio.
        </p>
      ) : (
        <div className={styles.categoryGrid}>
          {categories.map((cat) => {
            const slug = cat.slug?.current
            if (!slug) return null
            return (
              <Link key={cat._id} href={`/aide/${slug}`} className={styles.categoryPill}>
                {cat.title}
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}

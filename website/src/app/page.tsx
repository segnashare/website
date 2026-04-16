import {PageSections} from '@/components/cms/PageSections'
import {getHomePageData, urlFor} from '@/lib/sanity'
import {HomeHero} from '../components/home/HomeHero'
import {HomeStagedHero} from '../components/home/HomeStagedHero'
import styles from '@/components/home/homeHero.module.css'

export const revalidate = 30

export default async function HomePage() {
  const homePage = await getHomePageData()

  if (!homePage) {
    return (
      <main className={styles.fallback}>
        <h1>Home page non configuree</h1>
        <p>Creer un document "Page d’accueil" dans Sanity Studio pour alimenter cette page.</p>
      </main>
    )
  }

  const useStagedHero =
    homePage.heroPresentation === 'multi_state' &&
    Array.isArray(homePage.heroStates) &&
    homePage.heroStates.length > 0

  const backgroundImageUrl = homePage.heroImage?.asset
    ? urlFor(homePage.heroImage).width(2200).height(1400).fit('crop').url()
    : undefined

  return (
    <main>
      {useStagedHero ? (
        <HomeStagedHero homePage={homePage} />
      ) : (
        <HomeHero homePage={homePage} backgroundImageUrl={backgroundImageUrl} />
      )}
      <PageSections sections={homePage.sections} />
    </main>
  )
}

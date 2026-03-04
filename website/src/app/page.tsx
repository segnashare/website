import {getHomePageData, urlFor} from '@/lib/sanity'
import {HomeHero} from '../components/home/HomeHero'
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

  const backgroundImageUrl = homePage.heroImage?.asset
    ? urlFor(homePage.heroImage).width(2200).height(1400).fit('crop').url()
    : undefined

  return <HomeHero homePage={homePage} backgroundImageUrl={backgroundImageUrl} />
}

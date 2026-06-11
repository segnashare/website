import Image from 'next/image'
import Link from 'next/link'
import {PageSections} from '@/components/cms/PageSections'
import {PageUnifiedHero} from '@/components/layout/PageUnifiedHero'
import {getHomePageData, getNewsroomPageData, getPosts, urlFor} from '@/lib/sanity'

export const revalidate = 3600

function formatDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('fr-FR', {dateStyle: 'long'}).format(date)
}

export default async function NewsroomPage() {
  const [newsroomPage, posts, homePage] = await Promise.all([
    getNewsroomPageData(),
    getPosts(),
    getHomePageData(),
  ])

  const useHomeStagedSlice =
    homePage?.heroPresentation === 'multi_state' &&
    Array.isArray(homePage.heroStates) &&
    homePage.heroStates.length > 0

  const primary = homePage?.primaryCta
  const cta =
    primary?.label?.trim() && primary?.url?.trim()
      ? {label: primary.label.trim(), href: primary.url.trim()}
      : {label: 'Découvrir Segna', href: '/'}

  return (
    <main>
      <div className="container" style={{paddingBlock: '1rem 0'}}>
        <Link href="/">Retour à l’accueil</Link>
      </div>

      <PageUnifiedHero
        title={newsroomPage?.heroTitle ?? 'Newsroom'}
        subtitle={newsroomPage?.heroSubtitle}
        cta={cta}
        stagedStates={useHomeStagedSlice ? homePage!.heroStates! : null}
        stagedTransitionMs={homePage?.heroStageTransitionMs}
        staticImage={useHomeStagedSlice ? undefined : newsroomPage?.heroImage}
      />

      <div className="container" style={{paddingBlock: '2.5rem 5rem'}}>
        {newsroomPage?.introText ? (
          <p style={{margin: '0 0 2rem', lineHeight: 1.7, maxWidth: '42rem'}}>{newsroomPage.introText}</p>
        ) : null}

        <PageSections sections={newsroomPage?.sections} />

      {newsroomPage?.highlightedPost ? (
        <section style={{marginTop: '2.5rem'}}>
          <h2>Post mis en avant</h2>
          <article className="stack" style={{gap: '0.5rem'}}>
            <strong>{newsroomPage.highlightedPost.title}</strong>
            {formatDate(newsroomPage.highlightedPost.publishedAt) ? (
              <small>{formatDate(newsroomPage.highlightedPost.publishedAt)}</small>
            ) : null}
          </article>
        </section>
      ) : null}

      <section style={{marginTop: '2.5rem'}}>
        <h2>Toutes les actualites</h2>
        <div className="stack" style={{gap: '1rem'}}>
          {posts.map((post) => (
            <article key={post._id} style={{borderTop: '1px solid #e5e5e5', paddingTop: '1rem'}}>
              <h3 style={{margin: 0}}>{post.title}</h3>
              {formatDate(post.publishedAt) ? <p>{formatDate(post.publishedAt)}</p> : null}
              {post.image?.asset ? (
                <Image
                  src={urlFor(post.image).width(1000).height(560).fit('crop').url()}
                  alt={post.image.alt ?? post.title}
                  width={1000}
                  height={560}
                />
              ) : null}
            </article>
          ))}
          {posts.length === 0 ? <p>Aucun post publie pour le moment.</p> : null}
        </div>
      </section>
      </div>
    </main>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import {getNewsroomPageData, getPosts, urlFor} from '@/lib/sanity'

function formatDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('fr-FR', {dateStyle: 'long'}).format(date)
}

export default async function NewsroomPage() {
  const [newsroomPage, posts] = await Promise.all([getNewsroomPageData(), getPosts()])

  return (
    <main className="container" style={{paddingBlock: '3rem 5rem'}}>
      <div className="stack" style={{gap: '1.25rem'}}>
        <Link href="/">Retour a l’accueil</Link>
        <h1 style={{margin: 0}}>{newsroomPage?.heroTitle ?? 'Newsroom'}</h1>
        {newsroomPage?.heroSubtitle ? <p style={{margin: 0}}>{newsroomPage.heroSubtitle}</p> : null}
        {newsroomPage?.heroImage?.asset ? (
          <Image
            src={urlFor(newsroomPage.heroImage).width(1400).height(700).fit('crop').url()}
            alt={newsroomPage.heroImage.alt ?? newsroomPage.heroTitle}
            width={1400}
            height={700}
            priority
          />
        ) : null}
        {newsroomPage?.introText ? <p style={{lineHeight: 1.7}}>{newsroomPage.introText}</p> : null}
      </div>

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
    </main>
  )
}

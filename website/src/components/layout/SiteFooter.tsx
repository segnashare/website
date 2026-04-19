import type {CSSProperties} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type {WebsiteFooterData} from '@/lib/sanity'
import {urlFor} from '@/lib/sanity'
import {FooterSocialFromCms, hasFooterSocialLinks} from '@/components/layout/FooterSocialBar'
import styles from './siteFooter.module.css'

type Props = {
  data: WebsiteFooterData | null
}

function isExternalHref(href: string) {
  const t = href.trim().toLowerCase()
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('//') ||
    t.startsWith('mailto:') ||
    t.startsWith('tel:')
  )
}

function FooterNavLink({
  label,
  href,
  linkClassName,
}: {
  label: string
  href?: string
  linkClassName?: string
}) {
  const raw = (href ?? '').trim() || '#'
  const external = isExternalHref(raw)
  const cls = linkClassName ? `${styles.link} ${linkClassName}` : styles.link
  if (external) {
    return (
      <a href={raw} className={cls} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    )
  }
  return (
    <Link href={raw} className={cls}>
      {label}
    </Link>
  )
}

function FooterLogoBlock({data}: {data: WebsiteFooterData}) {
  const fileUrl = data.logoSvg?.asset?.url
  const mime = data.logoSvg?.asset?.mimeType
  const fileName = data.logoSvg?.asset?.originalFilename
  const showSvg = Boolean(
    fileUrl &&
      (mime === 'image/svg+xml' ||
        fileUrl.toLowerCase().includes('.svg') ||
        fileName?.toLowerCase().endsWith('.svg')),
  )

  if (showSvg && fileUrl) {
    return (
      <img
        src={fileUrl}
        alt=""
        aria-hidden
        className={styles.logoImg}
        width={160}
        height={40}
        decoding="async"
      />
    )
  }

  const img = data.logoImage
  const asset = img?.asset
  if (asset && (asset._ref || asset.url)) {
    const src = urlFor(img!).width(400).height(120).fit('max').auto('format').url()
    const alt = img?.alt?.trim() || 'Segna'
    return (
      <Image
        src={src}
        alt={alt}
        width={200}
        height={56}
        className={styles.logoImg}
        sizes="200px"
      />
    )
  }

  return <span className={styles.logoText}>Segna</span>
}

export function SiteFooter({data}: Props) {
  if (!data) return null

  const columns = (data.columns ?? []).filter((c) => c.title?.trim() && (c.links?.length ?? 0) > 0)
  const copyright = data.copyrightLine?.trim()
  const hasLogo = Boolean(
    data.logoSvg?.asset?.url ||
      (data.logoImage?.asset && (data.logoImage.asset._ref || data.logoImage.asset.url)),
  )
  const hasSocialRow = hasFooterSocialLinks(data.socialLinks)
  const legalItems = (data.legalLinks ?? []).filter((item) => item.label?.trim() && (item.href ?? '').trim())

  if (columns.length === 0 && !copyright && !hasLogo && !hasSocialRow && legalItems.length === 0) {
    return null
  }

  const bg = data.backgroundColor?.trim() || '#f9f7f2'
  const fg = data.textColor?.trim() || '#4a4642'
  const colHeading = data.columnHeadingColor?.trim()

  const rootStyle = {
    backgroundColor: bg,
    color: fg,
  }

  return (
    <footer className={styles.root} style={rootStyle}>
      <div className={styles.inner}>
        <div className={styles.main}>
          <div className={styles.brandCol}>
            <Link href="/" className={styles.logoLink} aria-label="Accueil — Segna">
              <FooterLogoBlock data={data} />
            </Link>
            {copyright ? <p className={styles.copyright}>{copyright}</p> : null}
            <FooterSocialFromCms items={data.socialLinks} />
          </div>

          {columns.length > 0 ? (
            <div
              className={styles.columns}
              style={{'--footer-cols': columns.length} as CSSProperties}
            >
              {columns.map((col) => (
                <nav key={col._key} className={styles.column} aria-label={col.title.trim()}>
                  <h2
                    className={styles.columnTitle}
                    style={colHeading ? {color: colHeading} : {opacity: 0.52}}
                  >
                    {col.title.trim()}
                  </h2>
                  <ul className={styles.linkList}>
                    {(col.links ?? []).map((item) => {
                      if (!item.label?.trim()) return null
                      return (
                        <li key={item._key}>
                          <FooterNavLink label={item.label.trim()} href={item.href} />
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              ))}
            </div>
          ) : null}
        </div>

        {legalItems.length > 0 ? (
          <nav className={styles.legalBar} aria-label="Liens légaux et conformité">
            <ul className={styles.legalList}>
              {legalItems.map((item) => (
                <li key={item._key} className={styles.legalItem}>
                  <FooterNavLink
                    label={item.label.trim()}
                    href={item.href}
                    linkClassName={styles.legalLink}
                  />
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </footer>
  )
}

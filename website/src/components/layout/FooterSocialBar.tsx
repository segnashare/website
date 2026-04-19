import type {WebsiteFooterSocialLink} from '@/lib/sanity'
import styles from './siteFooter.module.css'

function trimHref(h?: string | null) {
  const t = h?.trim() ?? ''
  if (!t) return ''
  if (/^https?:\/\//i.test(t) || t.startsWith('//') || t.startsWith('/')) return t
  return `https://${t}`
}

function isSvgAsset(row: WebsiteFooterSocialLink) {
  const a = row.icon?.asset
  if (!a?.url) return false
  const mime = a.mimeType?.toLowerCase() ?? ''
  const name = a.originalFilename?.toLowerCase() ?? ''
  const url = a.url.toLowerCase()
  return mime === 'image/svg+xml' || url.includes('.svg') || name.endsWith('.svg')
}

function rowIsRenderable(row: WebsiteFooterSocialLink) {
  const href = row.href?.trim()
  return Boolean(href && row.icon?.asset?.url && isSvgAsset(row))
}

export function hasFooterSocialLinks(items?: WebsiteFooterSocialLink[] | null) {
  return (items ?? []).some(rowIsRenderable)
}

export function FooterSocialFromCms({items}: {items?: WebsiteFooterSocialLink[] | null}) {
  const rows = (items ?? []).filter(rowIsRenderable)
  if (rows.length === 0) return null

  return (
    <div className={styles.socialRow}>
      {rows.map((row) => {
        const href = trimHref(row.href)
        const external = href.startsWith('http') || href.startsWith('//')
        const iconUrl = row.icon!.asset!.url!
        const aria = row.label?.trim() || 'Réseau social'
        return (
          <a
            key={row._key}
            href={href}
            className={styles.socialIconLink}
            aria-label={aria}
            title={aria}
            {...(external ? {target: '_blank', rel: 'noopener noreferrer'} : {})}
          >
            <img src={iconUrl} alt="" className={styles.socialIconImg} width={22} height={22} decoding="async" />
          </a>
        )
      })}
    </div>
  )
}

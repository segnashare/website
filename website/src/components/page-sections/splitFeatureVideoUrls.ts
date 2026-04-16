/** Utilitaires partagés (sans React) pour les URLs vidéo du bloc deux colonnes. */

export function youtubeVideoId(raw: string): string | null {
  try {
    const u = new URL(raw.trim())
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id || null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      const embed = u.pathname.match(/\/embed\/([^/?]+)/)
      if (embed?.[1]) return embed[1]
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/)
      if (shorts?.[1]) return shorts[1]
    }
  } catch {
    /* ignore */
  }
  return null
}

export function youtubeEmbedSrc(raw: string): string | null {
  const id = youtubeVideoId(raw)
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
}

export function vimeoEmbedSrc(raw: string): string | null {
  try {
    const u = new URL(raw.trim())
    if (!u.hostname.includes('vimeo.com')) return null
    const parts = u.pathname.split('/').filter(Boolean)
    const id = parts[0] === 'video' ? parts[1] : parts[0]
    if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
  } catch {
    /* ignore */
  }
  return null
}

export function youtubePosterUrl(videoPageUrl: string): string | null {
  const id = youtubeVideoId(videoPageUrl)
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
}

export function withVideoAutoplay(embedBase: string): string {
  const sep = embedBase.includes('?') ? '&' : '?'
  return `${embedBase}${sep}autoplay=1`
}

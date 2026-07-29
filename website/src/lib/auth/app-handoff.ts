import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'

/**
 * Redirige vers l’app avec la session website (hash handoff).
 * `nextPath` = chemin app relatif sûr (ex. `/profile`, `/exchange`).
 */
export async function redirectToAppWithSession(
  nextPath?: string,
  type: string = 'website_signin',
): Promise<void> {
  try {
    const supabase = createSupabaseBrowserClient()
    const {data} = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    const refreshToken = data.session?.refresh_token
    if (accessToken && refreshToken) {
      const target = new URL('/auth/handoff', SEGNA_APP_BASE_URL)
      const params = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        type,
      })
      const safeNext =
        nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : null
      if (safeNext) params.set('next', safeNext)
      target.hash = params.toString()
      window.location.assign(target.toString())
      return
    }
  } catch {
    // fallback below
  }
  const login = new URL('/auth/login', SEGNA_APP_BASE_URL)
  login.searchParams.set('from', 'member')
  if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) {
    login.searchParams.set('next', nextPath)
  }
  window.location.assign(login.toString())
}

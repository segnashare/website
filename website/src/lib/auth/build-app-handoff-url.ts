import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'

/** Construit l’URL handoff app (sans naviguer). */
export async function buildAppHandoffUrl(
  nextPath?: string,
  type: string = 'website_signin',
): Promise<string> {
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
      return target.toString()
    }
  } catch {
    // fallback below
  }
  const login = new URL('/auth/login', SEGNA_APP_BASE_URL)
  login.searchParams.set('from', 'member')
  if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) {
    login.searchParams.set('next', nextPath)
  }
  return login.toString()
}

import {NextResponse} from 'next/server'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import {runItemChatLifecycle} from '@/lib/item-chat/lifecycle'
import {syncItemChatDiscordInbound} from '@/lib/item-chat/sync-discord'

function verifyCron(request: Request): NextResponse | null {
  const expected =
    process.env.CRON_SECRET?.trim() ||
    process.env.SEGNA_CRON_SECRET?.trim() ||
    process.env.SEGNA_INTERNAL_ITEM_CHAT_SECRET?.trim() ||
    ''
  if (!expected) {
    return NextResponse.json({ok: false, error: 'cron_secret_not_configured'}, {status: 503})
  }
  const auth = request.headers.get('authorization')?.trim() ?? ''
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ok: false, error: 'unauthorized'}, {status: 401})
  }
  return null
}

/** Cron : sync Discord inbound + prompt utilité / clôture. */
export async function GET(request: Request) {
  const denied = verifyCron(request)
  if (denied) return denied

  const admin = getSupabaseServiceRoleClient()
  if (!admin) return NextResponse.json({ok: false, error: 'service_unavailable'}, {status: 503})

  try {
    const sync = await syncItemChatDiscordInbound(admin)
    const lifecycle = await runItemChatLifecycle(admin)
    return NextResponse.json({ok: true, sync, lifecycle})
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ok: false, error: msg}, {status: 500})
  }
}

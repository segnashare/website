import {NextResponse} from 'next/server'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import {
  listConversationsForIdentity,
  normalizeEmail,
  openOrCreateConversation,
  toConversationDto,
} from '@/lib/item-chat/service'
import type {ItemChatSource} from '@/lib/item-chat/types'
import {UUID_RE} from '@/lib/item-chat/types'

function visitorIdFrom(request: Request, bodyVisitorId?: unknown): string | null {
  const header = request.headers.get('x-segna-chat-visitor')?.trim() || ''
  if (UUID_RE.test(header)) return header.toLowerCase()
  if (typeof bodyVisitorId === 'string' && UUID_RE.test(bodyVisitorId.trim())) {
    return bodyVisitorId.trim().toLowerCase()
  }
  return null
}

export async function GET(request: Request) {
  const visitorId = visitorIdFrom(request)
  if (!visitorId) {
    return NextResponse.json({error: 'visitorId requis'}, {status: 400})
  }
  const admin = getSupabaseServiceRoleClient()
  if (!admin) return NextResponse.json({error: 'Service indisponible'}, {status: 503})

  const conversations = await listConversationsForIdentity({
    admin,
    visitorId,
    userId: null,
  })
  return NextResponse.json({conversations})
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({error: 'JSON invalide'}, {status: 400})
  }
  const b = body as Record<string, unknown>
  const visitorId = visitorIdFrom(request, b.visitorId)
  const itemIdRaw = typeof b.itemId === 'string' ? b.itemId.trim() : ''
  const itemId = itemIdRaw && UUID_RE.test(itemIdRaw) ? itemIdRaw : null
  const sourceRaw = typeof b.source === 'string' ? b.source.trim() : 'web'
  const source: ItemChatSource = sourceRaw === 'app' ? 'app' : 'web'

  if (!visitorId) {
    return NextResponse.json({error: 'Paramètres invalides'}, {status: 400})
  }
  if (itemIdRaw && !itemId) {
    return NextResponse.json({error: 'Paramètres invalides'}, {status: 400})
  }

  const admin = getSupabaseServiceRoleClient()
  if (!admin) return NextResponse.json({error: 'Service indisponible'}, {status: 503})

  let resolvedTitle: string | null =
    typeof b.itemTitle === 'string' ? b.itemTitle.trim().slice(0, 200) || null : null

  if (itemId) {
    const {data: item} = await admin.from('items').select('id, title').eq('id', itemId).maybeSingle()
    if (!item) {
      return NextResponse.json({error: 'Pièce introuvable'}, {status: 404})
    }
    if (!resolvedTitle && typeof item.title === 'string') resolvedTitle = item.title
  }

  const itemSizeLabel =
    typeof b.itemSizeLabel === 'string' ? b.itemSizeLabel.trim().slice(0, 80) || null : null
  const itemConditionLabel =
    typeof b.itemConditionLabel === 'string'
      ? b.itemConditionLabel.trim().slice(0, 80) || null
      : null

  try {
    const conversation = await openOrCreateConversation({
      admin,
      itemId,
      visitorId,
      source,
      contactEmail: normalizeEmail(b.contactEmail),
      userId: null,
      itemTitle: resolvedTitle,
      itemSizeLabel,
      itemConditionLabel,
      forceNew: b.forceNew === true && !itemId,
    })
    const dto = await toConversationDto(admin, conversation)
    return NextResponse.json({conversation: dto})
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({error: msg}, {status: 500})
  }
}

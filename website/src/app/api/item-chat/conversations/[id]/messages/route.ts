import {NextResponse} from 'next/server'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import {
  appendVisitorMessage,
  getConversationForVisitor,
  listMessages,
  normalizeMessageBody,
  toConversationDto,
} from '@/lib/item-chat/service'
import {syncItemChatDiscordInboundForConversation} from '@/lib/item-chat/sync-discord'
import type {ItemChatSource} from '@/lib/item-chat/types'
import {UUID_RE} from '@/lib/item-chat/types'

type RouteContext = {params: Promise<{id: string}>}

function visitorIdFrom(request: Request, bodyVisitorId?: unknown): string | null {
  const header = request.headers.get('x-segna-chat-visitor')?.trim() || ''
  if (UUID_RE.test(header)) return header.toLowerCase()
  if (typeof bodyVisitorId === 'string' && UUID_RE.test(bodyVisitorId.trim())) {
    return bodyVisitorId.trim().toLowerCase()
  }
  return null
}

export async function GET(request: Request, ctx: RouteContext) {
  const {id} = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({error: 'id invalide'}, {status: 400})
  const visitorId = visitorIdFrom(request)
  if (!visitorId) return NextResponse.json({error: 'visitorId requis'}, {status: 400})

  const admin = getSupabaseServiceRoleClient()
  if (!admin) return NextResponse.json({error: 'Service indisponible'}, {status: 503})

  const conversation = await getConversationForVisitor({
    admin,
    conversationId: id,
    visitorId,
    userId: null,
  })
  if (!conversation) return NextResponse.json({error: 'Conversation introuvable'}, {status: 404})

  // Import réponses Discord (admin) avant de renvoyer le fil
  try {
    await syncItemChatDiscordInboundForConversation(admin, conversation)
  } catch (e) {
    console.error('[item-chat] discord sync on GET failed', e)
  }

  const messages = await listMessages(admin, conversation.id)
  const dto = await toConversationDto(admin, conversation)
  return NextResponse.json({conversation: dto, messages})
}

export async function POST(request: Request, ctx: RouteContext) {
  const {id} = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({error: 'id invalide'}, {status: 400})

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({error: 'JSON invalide'}, {status: 400})
  }
  const b = body as Record<string, unknown>
  const visitorId = visitorIdFrom(request, b.visitorId)
  const messageBody = normalizeMessageBody(b.body)
  const source: ItemChatSource = b.source === 'app' ? 'app' : 'web'

  if (!visitorId || !messageBody) {
    return NextResponse.json({error: 'Message invalide'}, {status: 400})
  }

  const admin = getSupabaseServiceRoleClient()
  if (!admin) return NextResponse.json({error: 'Service indisponible'}, {status: 503})

  const conversation = await getConversationForVisitor({
    admin,
    conversationId: id,
    visitorId,
    userId: null,
  })
  if (!conversation) return NextResponse.json({error: 'Conversation introuvable'}, {status: 404})

  try {
    const result = await appendVisitorMessage({
      admin,
      conversation,
      body: messageBody,
      source,
    })
    const dto = await toConversationDto(admin, result.conversation)
    return NextResponse.json({
      message: result.message,
      ackMessage: result.ackMessage ?? null,
      conversation: dto,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({error: msg}, {status: 500})
  }
}

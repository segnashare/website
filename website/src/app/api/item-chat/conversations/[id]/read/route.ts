import {NextResponse} from 'next/server'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import {
  getConversationForVisitor,
  markConversationRead,
  toConversationDto,
} from '@/lib/item-chat/service'
import {UUID_RE} from '@/lib/item-chat/types'

type RouteContext = {params: Promise<{id: string}>}

function visitorIdFrom(request: Request): string | null {
  const header = request.headers.get('x-segna-chat-visitor')?.trim() || ''
  return UUID_RE.test(header) ? header.toLowerCase() : null
}

export async function POST(request: Request, ctx: RouteContext) {
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

  await markConversationRead({admin, conversationId: conversation.id})
  const {data} = await admin
    .from('item_chat_conversations')
    .select('*')
    .eq('id', conversation.id)
    .single()
  const dto = data
    ? await toConversationDto(admin, data as typeof conversation)
    : await toConversationDto(admin, {...conversation, last_read_at: new Date().toISOString()})
  return NextResponse.json({conversation: dto})
}

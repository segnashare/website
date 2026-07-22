import {NextResponse} from 'next/server'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import {
  getConversationForVisitor,
  recordUsefulnessRating,
  toConversationDto,
} from '@/lib/item-chat/service'
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
  const rating = b.rating === 'yes' || b.rating === 'no' ? b.rating : null
  if (!visitorId || !rating) {
    return NextResponse.json({error: 'Paramètres invalides'}, {status: 400})
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

  const result = await recordUsefulnessRating({admin, conversation, rating})
  if (!result) {
    return NextResponse.json({error: 'Réponse déjà enregistrée ou indisponible'}, {status: 409})
  }

  const dto = await toConversationDto(admin, result.conversation)
  return NextResponse.json({
    conversation: dto,
    messages: [result.answerMessage, result.thankYouMessage],
  })
}

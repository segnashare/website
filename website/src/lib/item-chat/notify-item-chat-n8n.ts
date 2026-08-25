import {
  buildItemChatThreadName,
  type ItemChatThreadKind,
} from '@/lib/item-chat/build-item-chat-thread-name'
import {
  getItemPublicAppUrl,
  getItemPublicWebUrl,
} from '@/lib/item-chat/config'
import {splitChatMessageMedia} from '@/lib/item-chat/split-chat-message-media'
import type {ItemChatConversationRow, ItemChatSource} from '@/lib/item-chat/types'

export type {ItemChatThreadKind}

export type ItemChatN8nNotifyInput = {
  conversation: ItemChatConversationRow
  messageId: string
  body: string
  source: ItemChatSource
  isFirstVisitorMessage: boolean
  /** Prénom + nom membre (si connecté). */
  clientFirstName?: string | null
  clientLastName?: string | null
}

export type ItemChatN8nNotifyResult =
  | {ok: true}
  | {ok: false; reason: 'missing_url' | 'http_error' | 'network_error'; detail?: string}

/** Tolère un commentaire inline dans `.env` (ex. `https://…/webhook/xxx #prod`). */
function readItemChatWebhookUrl(): string {
  const raw = process.env.N8N_ITEM_CHAT_WEBHOOK_URL?.trim() ?? ''
  if (!raw) return ''
  return raw.split('#')[0]?.trim() ?? ''
}

function readItemChatWebhookSecret(): string {
  return process.env.N8N_ITEM_CHAT_WEBHOOK_SECRET?.trim() ?? ''
}

/**
 * URL publique joignable par n8n pour reply/bind-thread.
 *
 * Important : le website a sa propre API + DB. Les réponses Discord doivent
 * revenir sur www.segnashare.com — pas sur app.segnashare.com (sinon le client
 * website ne voit jamais le message).
 */
function replyUrlForSource(_source: ItemChatSource): string {
  const override = process.env.ITEM_CHAT_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '')
  if (override) return `${override}/api/internal/item-chat/reply`

  const site = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '')

  const vercelEnv = process.env.VERCEL_ENV?.trim()
  if (vercelEnv === 'production') {
    return `${site || 'https://www.segnashare.com'}/api/internal/item-chat/reply`
  }

  // Preview / local : n8n cloud ne joint pas localhost → site public.
  if (site && !/localhost|127\.0\.0\.1|192\.168\./i.test(site)) {
    return `${site}/api/internal/item-chat/reply`
  }
  return 'https://www.segnashare.com/api/internal/item-chat/reply'
}

function resolveClientName(input: ItemChatN8nNotifyInput): {
  firstName: string | null
  lastName: string | null
  clientName: string
  threadKind: ItemChatThreadKind
  threadName: string
} {
  const firstName =
    typeof input.clientFirstName === 'string' && input.clientFirstName.trim()
      ? input.clientFirstName.trim()
      : null
  const lastName =
    typeof input.clientLastName === 'string' && input.clientLastName.trim()
      ? input.clientLastName.trim()
      : null
  const fromUser = [firstName, lastName].filter(Boolean).join(' ').trim()
  const email = input.conversation.contact_email?.trim() || ''
  const emailLocal = email.includes('@') ? email.split('@')[0]!.trim() : email
  const clientName = fromUser || emailLocal || 'Visiteur'
  const {threadKind, threadName} = buildItemChatThreadName({
    conversation: input.conversation,
    clientName,
  })
  return {
    firstName,
    lastName,
    clientName,
    threadKind,
    threadName,
  }
}

/**
 * Déclenche le workflow n8n (`N8N_ITEM_CHAT_WEBHOOK_URL`) après un message visitor chat pièce.
 */
export async function notifyItemChatN8n(
  input: ItemChatN8nNotifyInput,
): Promise<ItemChatN8nNotifyResult> {
  const url = readItemChatWebhookUrl()
  if (!url) {
    console.error('[n8n/item-chat] N8N_ITEM_CHAT_WEBHOOK_URL is not set')
    return {ok: false, reason: 'missing_url'}
  }

  const headers: Record<string, string> = {'Content-Type': 'application/json'}
  const secret = readItemChatWebhookSecret()
  if (secret) {
    headers.Authorization = `Bearer ${secret}`
  }

  const conv = input.conversation
  const bindUrl = replyUrlForSource(input.source).replace(/\/reply$/, '/bind-thread')
  const {firstName, lastName, clientName, threadKind, threadName} = resolveClientName(input)
  const {text: bodyText, imageUrls} = splitChatMessageMedia(input.body)
  const photoUrls = imageUrls.slice(0, 10)
  const payload = {
    event: input.isFirstVisitorMessage ? 'item_chat_opened' : 'item_chat_message',
    conversation_id: conv.id,
    message_id: input.messageId,
    is_first_visitor_message: input.isFirstVisitorMessage,
    discord_thread_id: conv.discord_thread_id,
    body: input.body,
    body_text: bodyText,
    photo_urls: photoUrls,
    source: input.source,
    item_id: conv.item_id,
    item_title: conv.item_title,
    item_size_label: conv.item_size_label,
    item_condition_label: conv.item_condition_label,
    cart_dispute_id:
      typeof conv.cart_dispute_id === 'string' && conv.cart_dispute_id.trim()
        ? conv.cart_dispute_id.trim()
        : null,
    contact_email: conv.contact_email,
    visitor_id: conv.visitor_id,
    user_id: conv.user_id,
    client_first_name: firstName,
    client_last_name: lastName,
    client_name: clientName,
    thread_kind: threadKind,
    thread_name: threadName,
    web_url: getItemPublicWebUrl(conv.item_id),
    app_url: getItemPublicAppUrl(conv.item_id),
    reply_url: replyUrlForSource(input.source),
    bind_thread_url: bindUrl,
    bind_authorization: 'Bearer <SEGNA_INTERNAL_ITEM_CHAT_SECRET>',
    sent_at: new Date().toISOString(),
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const detail = `${res.status}${text ? `: ${text.slice(0, 300)}` : ''}`
      console.warn('[n8n/item-chat] webhook HTTP', detail)
      return {ok: false, reason: 'http_error', detail}
    }
    return {ok: true}
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.warn('[n8n/item-chat] webhook failed', detail)
    return {ok: false, reason: 'network_error', detail}
  }
}

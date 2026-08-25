import type {SupabaseClient} from '@supabase/supabase-js'

/**
 * Dès qu’un opérateur répond (Discord → chat, ou staff via API) sur une conversation
 * liée à un litige, passe le dossier `open` → `in_review` (« En traitement » / timeline BO).
 * No-op si déjà traité / clôturé, ou si pas de litige lié.
 */
export async function markLinkedCartDisputeInReviewFromChat(
  admin: SupabaseClient,
  conversation: {id: string; cart_dispute_id?: string | null},
): Promise<void> {
  const conversationId = conversation.id?.trim()
  if (!conversationId) return

  let disputeId =
    typeof conversation.cart_dispute_id === 'string' ? conversation.cart_dispute_id.trim() : ''

  if (!disputeId) {
    const {data: byConv} = await admin
      .from('cart_disputes')
      .select('id')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .maybeSingle()
    disputeId = typeof byConv?.id === 'string' ? byConv.id : ''
  }

  if (!disputeId) {
    const {data: convRow} = await admin
      .from('item_chat_conversations')
      .select('cart_dispute_id')
      .eq('id', conversationId)
      .maybeSingle()
    disputeId =
      typeof convRow?.cart_dispute_id === 'string' ? convRow.cart_dispute_id.trim() : ''
  }

  if (!disputeId) return

  const {data: updated, error} = await admin
    .from('cart_disputes')
    .update({status: 'in_review', updated_at: new Date().toISOString()})
    .eq('id', disputeId)
    .eq('status', 'open')
    .select('id')
    .maybeSingle()

  if (error) {
    console.warn('[mark-cart-dispute-in-review-from-chat]', error.message)
    return
  }
  if (updated?.id) {
    console.info('[mark-cart-dispute-in-review-from-chat] in_review', disputeId)
  }
}

export type MemberOrderKind = 'location' | 'achat'

export function memberOrderTypeLabel(
  kind: MemberOrderKind,
  checkoutBorrowDurationDays?: number | null,
): string {
  if (kind === 'achat') return 'Achat'
  const days =
    checkoutBorrowDurationDays != null &&
    Number.isFinite(Number(checkoutBorrowDurationDays)) &&
    Number(checkoutBorrowDurationDays) >= 1
      ? Math.trunc(Number(checkoutBorrowDurationDays))
      : null
  if (days == null) return 'Location'
  return `Location ${days}j`
}

export function resolveMemberOrderKindFromCart(order: {
  checkout_purchase_mode?: boolean | null
  cart_order_stripe_invoices?:
    | {guest_purchase_stripe_invoice_id?: string | null}
    | {guest_purchase_stripe_invoice_id?: string | null}[]
    | null
}): MemberOrderKind {
  if (order.checkout_purchase_mode === true) return 'achat'
  const nested = order.cart_order_stripe_invoices
  const invoiceRow = Array.isArray(nested) ? nested[0] : nested
  if (
    typeof invoiceRow?.guest_purchase_stripe_invoice_id === 'string' &&
    invoiceRow.guest_purchase_stripe_invoice_id.trim()
  ) {
    return 'achat'
  }
  return 'location'
}

export function formatOrderNumberCompact(cartId: string): string {
  return cartId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

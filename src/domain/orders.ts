/**
 * Order combining.
 *
 * Two orders become one whenever the rule "one order per customer per campaign"
 * would otherwise be broken: merging duplicate customers, and carrying orders
 * forward when a campaign closes.
 */
import type { Order, OrderItem } from '../db/types'
import { earlierIso, laterIso } from './dates'
import { fromCents, toCents } from './money'
import { productKey } from './text'

/**
 * Same product, one line. The target's price wins: it is what the customer was
 * already quoted, or in a carry-forward the price of the campaign being bought.
 */
export function mergeItems(targetItems: OrderItem[], sourceItems: OrderItem[]): OrderItem[] {
  const merged = targetItems.map((item) => ({ ...item }))
  for (const item of sourceItems) {
    const key = productKey(item)
    const existing = merged.find((candidate) => productKey(candidate) === key)
    if (existing) existing.quantity += item.quantity
    else merged.push({ ...item })
  }
  return merged
}

/** Folds `source` into `target`, keeping the target's identity and campaign. */
export function combineOrders(target: Order, source: Order): Order {
  const notes = [target.notes, source.notes].filter((note) => note && note.trim() !== '')
  return {
    ...target,
    items: mergeItems(target.items, source.items),
    paidAmount: fromCents(toCents(target.paidAmount) + toCents(source.paidAmount)),
    shippingCost: fromCents(toCents(target.shippingCost) + toCents(source.shippingCost)),
    // Half a combined order delivered is not a delivered order: better to hand
    // it over twice than to drop it off the "por entregar" list.
    deliveredAt:
      target.deliveredAt && source.deliveredAt ? laterIso(target.deliveredAt, source.deliveredAt) : undefined,
    contacts: [...target.contacts, ...source.contacts].sort(),
    createdAt: earlierIso(target.createdAt, source.createdAt),
    ...(notes.length > 0 ? { notes: notes.join('\n') } : {}),
  }
}

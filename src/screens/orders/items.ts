/**
 * What the order screen needs from the items of every past order: the
 * catalogue. Editing a line is `orders.setItemQuantity` and
 * `orders.setItemPrice`, both keyed by product name and both a single
 * transaction, so no screen has to rebuild a line out of two writes.
 */
import type { Order } from '../../db/types'
import type { PastItem } from '../../domain'

/** The catalogue builds itself: every line ever sold is a product to suggest. */
export function itemHistory(all: readonly Order[]): PastItem[] {
  return all.flatMap((order) =>
    order.items.map((item) => ({ name: item.name, price: item.price, usedAt: order.createdAt })),
  )
}

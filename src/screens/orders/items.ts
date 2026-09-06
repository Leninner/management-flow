/**
 * Editing the lines of an existing order.
 *
 * The repository exposes `addItem` and `removeItem` and nothing else, because
 * during a live nothing else is needed. Here, on the calm path, a quantity or
 * a price does change: raising a quantity is an append (the repository merges
 * it into the same line), and lowering one or fixing a price is the line
 * rewritten. A rewritten line lands at the end of the array, so the screen
 * always draws the items in a stable order of its own and the row never jumps
 * under her thumb.
 */
import { orders } from '../../data'
import type { Order, OrderItem } from '../../db/types'
import { toCents, type PastItem } from '../../domain'

export interface DisplayItem {
  item: OrderItem
  /** Position inside `order.items`, which is what the repository removes by. */
  index: number
}

export function displayItems(order: Order): DisplayItem[] {
  return order.items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.name.localeCompare(b.item.name, 'es', { numeric: true, sensitivity: 'base' }))
}

/** The catalogue builds itself: every line ever sold is a product to suggest. */
export function itemHistory(all: readonly Order[]): PastItem[] {
  return all.flatMap((order) =>
    order.items.map((item) => ({ name: item.name, price: item.price, usedAt: order.createdAt })),
  )
}

export async function setItemQuantity(order: Order, index: number, quantity: number): Promise<void> {
  const item = order.items[index]
  if (!item || quantity < 1 || quantity === item.quantity) return

  const target = { campaignId: order.campaignId, customerId: order.customerId }
  if (quantity > item.quantity) {
    await orders.addItem({
      ...target,
      item: { name: item.name, quantity: quantity - item.quantity, price: item.price },
    })
    return
  }

  await orders.removeItem(order.id, index)
  await orders.addItem({ ...target, item: { name: item.name, quantity, price: item.price } })
}

export async function setItemPrice(order: Order, index: number, price: number): Promise<void> {
  const item = order.items[index]
  if (!item || price < 0 || toCents(price) === toCents(item.price)) return

  await orders.removeItem(order.id, index)
  await orders.addItem({
    campaignId: order.campaignId,
    customerId: order.customerId,
    item: { name: item.name, quantity: item.quantity, price },
  })
}

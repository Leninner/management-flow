/**
 * Order repository.
 *
 * The rule that governs this file: ONE ORDER PER CUSTOMER PER CAMPAIGN. She
 * asked three times during the live and again on WhatsApp; that is one order,
 * one total, one payment and one shipping cost. Without it she pays freight
 * twice.
 */
import { db, newId } from '../db/db'
import type { Order, OrderItem } from '../db/types'
import { nowIso } from '../domain/dates'
import { fromCents, toCents } from '../domain/money'
import { combineOrders } from '../domain/orders'
import { productKey, splitProductCode } from '../domain/text'

/** What the live capture screen produces: a name, and maybe a code, quantity or price. */
export interface CapturedItem {
  code?: string
  name: string
  quantity?: number
  price?: number
}

export interface AddItemInput {
  campaignId: string
  customerId: string
  item: CapturedItem
}

export async function get(id: string): Promise<Order | undefined> {
  return db.orders.get(id)
}

/** There is at most one, by construction. */
export async function findFor(campaignId: string, customerId: string): Promise<Order | undefined> {
  return db.orders.where('[campaignId+customerId]').equals([campaignId, customerId]).first()
}

export async function listByCampaign(campaignId: string): Promise<Order[]> {
  return db.orders.where('campaignId').equals(campaignId).toArray()
}

export async function listByCustomer(customerId: string): Promise<Order[]> {
  return db.orders.where('customerId').equals(customerId).toArray()
}

export async function listAll(): Promise<Order[]> {
  return db.orders.toArray()
}

/**
 * Appends an item to the customer's order for the campaign, creating that order
 * the first time. The lookup and the write share one transaction, so two
 * captures fired at the same time cannot end up as two orders.
 */
export async function addItem({ campaignId, customerId, item }: AddItemInput): Promise<Order> {
  const captured = normalizeCaptured(item)

  return db.transaction('rw', db.orders, db.campaignProducts, async () => {
    // The campaign catalogue builds itself out of what she sells, so the cost
    // she types in later has somewhere to land and the next customer gets this
    // campaign's price instead of last campaign's.
    if (captured.code) {
      const id = `${campaignId}:${captured.code}`
      const known = await db.campaignProducts.get(id)
      if (!known) {
        await db.campaignProducts.put({
          id,
          campaignId,
          code: captured.code,
          name: captured.name,
          ...(captured.price === undefined ? {} : { price: captured.price }),
        })
      } else if (known.price === undefined && captured.price !== undefined) {
        await db.campaignProducts.put({ ...known, price: captured.price })
      }
    }

    const existing = await db.orders.where('[campaignId+customerId]').equals([campaignId, customerId]).first()

    if (!existing) {
      const order: Order = {
        id: newId(),
        campaignId,
        customerId,
        items: [captured],
        paidAmount: 0,
        shippingCost: 0,
        contacts: [],
        createdAt: nowIso(),
      }
      await db.orders.add(order)
      return order
    }

    const items = appendItem(existing.items, captured)
    const updated = { ...existing, items }
    await db.orders.put(updated)
    return updated
  })
}

/** Nothing paid and nothing delivered: the order has not started happening. */
export function isOpen(order: Order): boolean {
  return toCents(order.paidAmount) === 0 && order.deliveredAt === undefined
}

/**
 * Carries the orders that never got going into the next campaign. What did not
 * make the cutoff waits for the next catalogue, and it has to arrive whole:
 * items, money, notes, contacts and the date it was written down.
 *
 * "Never got going" used to mean an unticked confirmation flag. With that flag
 * gone it means nothing paid and nothing delivered, which is the same set
 * without asking her to maintain it.
 *
 * One transaction for the whole batch. Replaying this order by order is N
 * transactions on money data, and an interruption halfway leaves an order
 * living in two campaigns or a payment silently dropped.
 *
 * Returns how many orders moved. A customer who already has an order in the
 * target campaign gets the carried items merged into it, never a second order.
 */
export async function moveOpenOrders(fromCampaignId: string, toCampaignId: string): Promise<number> {
  if (fromCampaignId === toCampaignId) throw new Error('An order cannot move into its own campaign')

  return db.transaction('rw', db.orders, db.campaigns, async () => {
    const target = await db.campaigns.get(toCampaignId)
    if (!target) throw new Error(`Unknown campaign: ${toCampaignId}`)

    const carried = await db.orders.where('campaignId').equals(fromCampaignId).toArray()
    const open = carried.filter(isOpen)
    if (open.length === 0) return 0

    const waiting = await db.orders.where('campaignId').equals(toCampaignId).toArray()
    const byCustomer = new Map(waiting.map((order) => [order.customerId, order]))

    const writes: Order[] = []
    const absorbed: string[] = []

    for (const order of open) {
      const existing = byCustomer.get(order.customerId)
      if (!existing) {
        // Same id, new campaign: nothing to copy, so nothing to lose.
        const moved = { ...order, campaignId: toCampaignId }
        byCustomer.set(order.customerId, moved)
        writes.push(moved)
        continue
      }
      const combined = combineOrders(existing, order)
      byCustomer.set(order.customerId, combined)
      writes.push(combined)
      absorbed.push(order.id)
    }

    await db.orders.bulkPut(writes)
    if (absorbed.length > 0) await db.orders.bulkDelete(absorbed)
    return open.length
  })
}

export async function recordPayment(id: string, amount: number): Promise<Order> {
  if (!Number.isFinite(amount)) throw new Error('A payment must be a number')
  return patch(id, (order) => {
    const cents = toCents(order.paidAmount) + toCents(amount)
    if (cents < 0) throw new Error('A payment cannot leave a negative paid amount')
    return { paidAmount: fromCents(cents) }
  })
}

export async function setShippingCost(id: string, cost: number): Promise<Order> {
  if (!Number.isFinite(cost) || cost < 0) throw new Error('A shipping cost must be zero or more')
  return patch(id, () => ({ shippingCost: fromCents(toCents(cost)) }))
}

export async function markDelivered(id: string, deliveredAt: string = nowIso()): Promise<Order> {
  return patch(id, () => ({ deliveredAt }))
}

/** One entry per "ya le escribí". The length is the follow-up counter. */
export async function recordContact(id: string, at: string = nowIso()): Promise<Order> {
  return patch(id, (order) => ({ contacts: [...order.contacts, at] }))
}

/**
 * Corrects a quantity in place. Zero removes the line, and the last line going
 * leaves an order with no items, exactly like `removeItem`: an order is only
 * deleted when she cancels it.
 *
 * One transaction. Rebuilding this as a remove plus a capture is two writes on
 * money data, and an interruption between them loses the line outright.
 */
export async function setItemQuantity(id: string, key: string, quantity: number): Promise<Order> {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error('A quantity cannot be negative')
  return patch(id, (order) => {
    const index = indexOfItem(order, key)
    if (quantity === 0) return { items: order.items.filter((_, position) => position !== index) }
    return { items: order.items.map((item, position) => (position === index ? { ...item, quantity } : item)) }
  })
}

/**
 * Fixes a price in place, keeping the quantity and the position of the line.
 * This is where "a María se lo dejo en 16": the price lives inside her item, so
 * nobody else's balance moves.
 */
export async function setItemPrice(id: string, key: string, price: number): Promise<Order> {
  if (!Number.isFinite(price) || price < 0) throw new Error('A price cannot be negative')
  const exact = fromCents(toCents(price))
  return patch(id, (order) => {
    const index = indexOfItem(order, key)
    return { items: order.items.map((item, position) => (position === index ? { ...item, price: exact } : item)) }
  })
}

export async function removeItem(id: string, index: number): Promise<Order> {
  return patch(id, (order) => {
    if (index < 0 || index >= order.items.length) throw new Error(`No item at position ${index}`)
    return { items: order.items.filter((_, position) => position !== index) }
  })
}

export async function setNotes(id: string, notes: string): Promise<Order> {
  return patch(id, () => ({ notes }))
}

/** A cancelled order is deleted. At this scale one more state is not worth it. */
export async function remove(id: string): Promise<void> {
  await db.orders.delete(id)
}

/**
 * Same matching a capture uses when it merges: the Oriflame code when there is
 * one, and otherwise the trimmed, case-insensitive name. A looser or stricter
 * rule here would silently edit the wrong line, or add a duplicate one instead
 * of the line she tapped.
 */
function indexOfItem(order: Order, key: string): number {
  const wanted = key.startsWith('#') ? key : productKey(splitProductCode(key))
  const index = order.items.findIndex((item) => productKey(item) === wanted)
  if (index < 0) throw new Error(`No item "${key}" in order ${order.id}`)
  return index
}

function normalizeCaptured(item: CapturedItem): OrderItem {
  const split = item.code
    ? { code: item.code, name: item.name.trim() || item.code }
    : splitProductCode(item.name)
  if (!split.name) throw new Error('An item needs a code or a name')

  const quantity = item.quantity ?? 1
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('A quantity must be greater than zero')

  if (item.price !== undefined && (!Number.isFinite(item.price) || item.price < 0)) {
    throw new Error('A price cannot be negative')
  }

  // An absent price stays absent. Storing it as zero is what used to make an
  // order look settled while a line in it had never been priced.
  return {
    ...(split.code ? { code: split.code } : {}),
    name: split.name,
    quantity,
    ...(item.price === undefined ? {} : { price: item.price }),
  }
}

/**
 * Merges by product. The price already in the order wins: it is what the
 * customer was quoted. The exception is a line written during the live with no
 * price yet, which the first real price fills in.
 */
function appendItem(items: OrderItem[], captured: OrderItem): OrderItem[] {
  const key = productKey(captured)
  const merged = items.map((item) => ({ ...item }))
  const existing = merged.find((item) => productKey(item) === key)
  if (!existing) {
    merged.push(captured)
    return merged
  }
  existing.quantity += captured.quantity
  if (existing.price === undefined && captured.price !== undefined) existing.price = captured.price
  return merged
}

async function patch(id: string, changes: (order: Order) => Partial<Order>): Promise<Order> {
  return db.transaction('rw', db.orders, async () => {
    const order = await db.orders.get(id)
    if (!order) throw new Error(`Unknown order: ${id}`)
    const updated = { ...order, ...changes(order) }
    await db.orders.put(updated)
    return updated
  })
}

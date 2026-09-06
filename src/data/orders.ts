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
import { normalizeName } from '../domain/text'

/** What the live capture screen produces: a name, and maybe a quantity or price. */
export interface CapturedItem {
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

  return db.transaction('rw', db.orders, async () => {
    const existing = await db.orders.where('[campaignId+customerId]').equals([campaignId, customerId]).first()

    if (!existing) {
      const order: Order = {
        id: newId(),
        campaignId,
        customerId,
        items: [captured],
        paidAmount: 0,
        shippingCost: 0,
        confirmed: false,
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

export async function markConfirmed(id: string, confirmed = true): Promise<Order> {
  return patch(id, () => ({ confirmed }))
}

export async function markDelivered(id: string, deliveredAt: string = nowIso()): Promise<Order> {
  return patch(id, () => ({ deliveredAt }))
}

/** One entry per "ya le escribí". The length is the follow-up counter. */
export async function recordContact(id: string, at: string = nowIso()): Promise<Order> {
  return patch(id, (order) => ({ contacts: [...order.contacts, at] }))
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

function normalizeCaptured(item: CapturedItem): OrderItem {
  const name = item.name.trim()
  if (!name) throw new Error('An item needs a name')

  const quantity = item.quantity ?? 1
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('A quantity must be greater than zero')

  const price = item.price ?? 0
  if (!Number.isFinite(price) || price < 0) throw new Error('A price cannot be negative')

  return { name, quantity, price }
}

/**
 * Merges by product name. The price already in the order wins: it is what the
 * customer was quoted. The exception is a line captured during the live with no
 * price yet, which the first real price fills in.
 */
function appendItem(items: OrderItem[], captured: OrderItem): OrderItem[] {
  const key = normalizeName(captured.name)
  const merged = items.map((item) => ({ ...item }))
  const existing = merged.find((item) => normalizeName(item.name) === key)
  if (!existing) {
    merged.push(captured)
    return merged
  }
  existing.quantity += captured.quantity
  if (toCents(existing.price) === 0 && toCents(captured.price) > 0) existing.price = captured.price
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

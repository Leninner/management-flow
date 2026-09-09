/**
 * Money.
 *
 * Every amount is USD and every intermediate sum happens in integer cents:
 * `0.1 + 0.2` is not `0.3` in binary floating point, and a balance that ends up
 * at 5e-17 instead of 0 makes the app claim a paid order is still owed.
 *
 * Nothing here is ever stored. Totals are always derived from the items.
 *
 * An item with no price yet contributes nothing to a sum and is counted
 * instead. Treating it as zero would produce a total that looks finished and is
 * short, which is the one kind of wrong number this app cannot afford.
 */
import type { Order, OrderItem } from '../db/types'

export function toCents(amount: number): number {
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100
}

export function hasPrice(item: OrderItem): boolean {
  return item.price !== undefined
}

export function itemCents(item: OrderItem): number {
  return item.price === undefined ? 0 : Math.round(toCents(item.price) * item.quantity)
}

type Priced = Pick<Order, 'items'>
type Shipped = Priced & Pick<Order, 'shippingCost'>
type Settled = Shipped & Pick<Order, 'paidAmount'>

/**
 * How many lines are still waiting for a price. Every screen that shows a total
 * has to show this next to it, or the total is a claim it cannot support.
 */
export function missingPriceCount(order: Priced): number {
  return order.items.reduce((count, item) => count + (hasPrice(item) ? 0 : 1), 0)
}

export function orderSubtotalCents(order: Priced): number {
  let cents = 0
  for (const item of order.items) cents += itemCents(item)
  return cents
}

export function orderTotalCents(order: Shipped): number {
  return orderSubtotalCents(order) + toCents(order.shippingCost)
}

export function orderBalanceCents(order: Settled): number {
  return orderTotalCents(order) - toCents(order.paidAmount)
}

export function orderSubtotal(order: Priced): number {
  return fromCents(orderSubtotalCents(order))
}

export function orderTotal(order: Shipped): number {
  return fromCents(orderTotalCents(order))
}

export function orderBalance(order: Settled): number {
  return fromCents(orderBalanceCents(order))
}

/**
 * Nothing left to collect. An order with a line still missing its price is
 * never settled, however the arithmetic comes out: the number it is being
 * compared against is incomplete.
 */
export function isPaid(order: Settled): boolean {
  return missingPriceCount(order) === 0 && orderBalanceCents(order) <= 0
}

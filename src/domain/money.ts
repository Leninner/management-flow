/**
 * Money.
 *
 * Every amount is USD and every intermediate sum happens in integer cents:
 * `0.1 + 0.2` is not `0.3` in binary floating point, and a balance that ends up
 * at 5e-17 instead of 0 makes the app claim a paid order is still owed.
 *
 * Nothing here is ever stored. Totals are always derived from the items.
 */
import type { Order, OrderItem } from '../db/types'

export function toCents(amount: number): number {
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100
}

export function itemCents(item: OrderItem): number {
  return Math.round(toCents(item.price) * item.quantity)
}

type Priced = Pick<Order, 'items'>
type Shipped = Priced & Pick<Order, 'shippingCost'>
type Settled = Shipped & Pick<Order, 'paidAmount'>

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

export function isPaid(order: Settled): boolean {
  return orderBalanceCents(order) <= 0
}

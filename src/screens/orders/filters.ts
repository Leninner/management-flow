/**
 * The three ways she looks at the order list, and the colour each order gets.
 *
 * The buckets are views, not exclusive states: an order that is neither paid
 * nor delivered shows up under "por cobrar" and under "por entregar", because
 * both of those are things she still has to do.
 *
 * There is no "sin confirmar" bucket any more. If she wrote it down it is a
 * pedido, and a filter for orders she had not gone back to tick was a filter
 * over her own paperwork rather than over the business.
 */
import type { Order } from '../../db/types'
import { fromCents, isPaid, missingPriceCount, orderBalanceCents } from '../../domain'
import type { Status } from '../../ui'

export type OrderFilter = 'toCollect' | 'toDeliver' | 'done'

export interface OrderFilterOption {
  key: OrderFilter
  label: string
}

export const ORDER_FILTERS: readonly OrderFilterOption[] = [
  { key: 'toCollect', label: 'Por cobrar' },
  { key: 'toDeliver', label: 'Por entregar' },
  { key: 'done', label: 'Completos' },
]

/**
 * Money first: an order that owes is red even if it is already delivered. An
 * order with a line still missing its price is amber, never green: its balance
 * is arithmetic over an incomplete list.
 */
export function orderStatus(order: Order): Status | undefined {
  if (orderBalanceCents(order) > 0) return 'owes'
  if (missingPriceCount(order) > 0) return 'pending'
  return order.deliveredAt ? 'done' : 'pending'
}

export function matchesFilter(order: Order, filter: OrderFilter): boolean {
  switch (filter) {
    case 'toCollect':
      return !isPaid(order)
    case 'toDeliver':
      return !order.deliveredAt
    case 'done':
      return isPaid(order) && order.deliveredAt !== undefined
  }
}

/** Whatever the filter, the oldest or the largest debt sits at the top. */
const COMPARATORS: Record<OrderFilter, (a: Order, b: Order) => number> = {
  toCollect: (a, b) => orderBalanceCents(b) - orderBalanceCents(a),
  toDeliver: (a, b) => a.createdAt.localeCompare(b.createdAt),
  done: (a, b) => (b.deliveredAt ?? '').localeCompare(a.deliveredAt ?? ''),
}

export function filterOrders(orders: readonly Order[], filter: OrderFilter): Order[] {
  return orders.filter((order) => matchesFilter(order, filter)).sort(COMPARATORS[filter])
}

export function countByFilter(orders: readonly Order[]): Record<OrderFilter, number> {
  const counts: Record<OrderFilter, number> = { toCollect: 0, toDeliver: 0, done: 0 }
  for (const option of ORDER_FILTERS) {
    counts[option.key] = orders.reduce(
      (total, order) => total + (matchesFilter(order, option.key) ? 1 : 0),
      0,
    )
  }
  return counts
}

/** What the shown orders still owe. Overpayments never subtract from a debt. */
export function owedBy(orders: readonly Order[]): number {
  let cents = 0
  for (const order of orders) {
    const balance = orderBalanceCents(order)
    if (balance > 0) cents += balance
  }
  return fromCents(cents)
}

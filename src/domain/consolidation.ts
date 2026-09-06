/**
 * The order she places with Oriflame.
 *
 * Without this she opens twelve orders and adds up by hand; if she asks for
 * four instead of five, somebody is left without their product.
 */
import type { Order } from '../db/types'
import { normalizeName } from './text'

export interface ConsolidatedItem {
  name: string
  quantity: number
}

export interface Consolidation {
  items: ConsolidatedItem[]
  totalUnits: number
  customerCount: number
}

type ConsolidableOrder = Pick<Order, 'items' | 'customerId'>

/** Merges every item of every order into one shopping list, sorted by name. */
export function consolidateForSupplier(orders: ConsolidableOrder[]): Consolidation {
  const byProduct = new Map<string, ConsolidatedItem>()
  const customers = new Set<string>()
  let totalUnits = 0

  for (const order of orders) {
    customers.add(order.customerId)
    for (const item of order.items) {
      const key = normalizeName(item.name)
      if (!key) continue
      const existing = byProduct.get(key)
      if (existing) existing.quantity += item.quantity
      else byProduct.set(key, { name: item.name.trim(), quantity: item.quantity })
      totalUnits += item.quantity
    }
  }

  const items = [...byProduct.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }),
  )

  return { items, totalUnits, customerCount: customers.size }
}

function plural(count: number, singular: string, many: string): string {
  return `${count} ${count === 1 ? singular : many}`
}

/** Plain text ready to paste into WhatsApp. User facing, so it is in Spanish. */
export function formatForClipboard(result: Consolidation, campaignName: string): string {
  return [
    `PEDIDO CAMPAÑA ${campaignName} — ${plural(result.customerCount, 'cliente', 'clientes')}`,
    ...result.items.map((item) => ` ${item.quantity}x  ${item.name}`),
    ` Total: ${plural(result.totalUnits, 'unidad', 'unidades')}`,
  ].join('\n')
}

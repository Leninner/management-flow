/**
 * The order she places with Oriflame.
 *
 * Without this she opens twelve orders and adds up by hand; if she asks for
 * four instead of five, somebody is left without their product.
 */
import type { Order } from '../db/types'
import { productKey, productLabel } from './text'

export interface ConsolidatedItem {
  code?: string
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
      const key = productKey(item)
      if (!key) continue
      const existing = byProduct.get(key)
      if (existing) existing.quantity += item.quantity
      else byProduct.set(key, { ...(item.code ? { code: item.code } : {}), name: item.name.trim(), quantity: item.quantity })
      totalUnits += item.quantity
    }
  }

  const items = [...byProduct.values()].sort((a, b) =>
    productLabel(a).localeCompare(productLabel(b), 'es', { numeric: true, sensitivity: 'base' }),
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
    ...result.items.map((item) => ` ${item.quantity}x  ${productLabel(item)}`),
    ` Total: ${plural(result.totalUnits, 'unidad', 'unidades')}`,
  ].join('\n')
}

/**
 * The shape Oriflame's quick order wants: code and quantity, one product per
 * line, nothing else. Lines with no code are left out because there is nothing
 * to type into that form for them; the caller reports how many.
 */
export function formatForQuickOrder(result: Consolidation): string {
  return result.items
    .filter((item) => item.code)
    .map((item) => `${item.code}\t${item.quantity}`)
    .join('\n')
}

/** Products that cannot be pasted into the quick order because they have no code. */
export function withoutCode(result: Consolidation): ConsolidatedItem[] {
  return result.items.filter((item) => !item.code)
}

/**
 * The consolidated order plus the two things a bare consolidation cannot
 * answer.
 *
 * Who is behind a line: when Oriflame ships short she deletes units from one
 * line and has to know instantly whose pedido just got smaller.
 *
 * How much of it rides on people who have not put a cent in: those are the ones
 * who flake, and every unit of them is money she fronts with her own card.
 */
import type { Customer, Order } from '../../db/types'
import {
  consolidateForSupplier,
  orderBalanceCents,
  productKey,
  toCents,
  type Consolidation,
} from '../../domain'

export interface LineCustomer {
  customerId: string
  name: string
  quantity: number
  /** Has not paid a cent towards their pedido. */
  unpaid: boolean
}

export interface SupplierLine {
  key: string
  code?: string
  name: string
  quantity: number
  /** Who is waiting for this line, biggest first. */
  customers: LineCustomer[]
}

export interface SupplierPlan {
  consolidation: Consolidation
  lines: SupplierLine[]
  /** What she is fronting for people who have paid nothing at all, in cents. */
  exposedCents: number
  exposedOrders: number
}

/** A customer row can outlive its customer record; the line still has to show. */
const UNKNOWN_CUSTOMER = 'Sin nombre'

export function buildSupplierPlan(
  orders: readonly Order[],
  customers: readonly Customer[],
): SupplierPlan {
  const consolidation = consolidateForSupplier([...orders])
  const nameById = new Map(customers.map((customer) => [customer.id, customer.name]))

  // Product key -> customer id -> what that customer asked for.
  const buyers = new Map<string, Map<string, LineCustomer>>()
  for (const order of orders) {
    const unpaid = toCents(order.paidAmount) === 0
    for (const item of order.items) {
      const key = productKey(item)
      if (!key) continue

      let line = buyers.get(key)
      if (!line) {
        line = new Map<string, LineCustomer>()
        buyers.set(key, line)
      }

      const existing = line.get(order.customerId)
      if (existing) {
        existing.quantity += item.quantity
        continue
      }
      line.set(order.customerId, {
        customerId: order.customerId,
        name: nameById.get(order.customerId) ?? UNKNOWN_CUSTOMER,
        quantity: item.quantity,
        unpaid,
      })
    }
  }

  const lines: SupplierLine[] = consolidation.items.map((item) => {
    const key = productKey(item)
    return {
      key,
      ...(item.code ? { code: item.code } : {}),
      name: item.name,
      quantity: item.quantity,
      customers: [...(buyers.get(key)?.values() ?? [])].sort(
        (a, b) =>
          b.quantity - a.quantity || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
      ),
    }
  })

  let exposedCents = 0
  let exposedOrders = 0
  for (const order of orders) {
    if (toCents(order.paidAmount) > 0) continue
    const owed = orderBalanceCents(order)
    if (owed <= 0) continue
    exposedOrders += 1
    exposedCents += owed
  }

  return { consolidation, lines, exposedCents, exposedOrders }
}

/** "María, Ana y 3 más". Two names is as much as a row can hold. */
export function buyersLabel(customers: readonly LineCustomer[]): string {
  const names = customers.map((customer) => customer.name)
  if (names.length === 0) return ''
  if (names.length <= 2) return names.join(' y ')
  return `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`
}

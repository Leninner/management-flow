/**
 * The consolidated order plus the two things a bare consolidation cannot
 * answer.
 *
 * Who is behind a line: when Oriflame ships short she deletes units from one
 * line and has to know instantly whose order just got smaller.
 *
 * How much of the order rides on orders nobody ever confirmed: those are the
 * ones people flake on, and every unit of them is money she pays for.
 */
import type { Customer, Order } from '../../db/types'
import { consolidateForSupplier, normalizeName, type Consolidation } from '../../domain'

export interface LineCustomer {
  customerId: string
  name: string
  quantity: number
  confirmed: boolean
}

export interface SupplierLine {
  name: string
  quantity: number
  /** Who is waiting for this line, biggest first. */
  customers: LineCustomer[]
}

export interface SupplierPlan {
  consolidation: Consolidation
  lines: SupplierLine[]
  /** Counted on every order of the campaign, in or out of the consolidation. */
  unconfirmedUnits: number
  unconfirmedOrders: number
}

/** A customer row can outlive its customer record; the line still has to show. */
const UNKNOWN_CUSTOMER = 'Sin nombre'

export function buildSupplierPlan(
  orders: readonly Order[],
  customers: readonly Customer[],
  includeUnconfirmed: boolean,
): SupplierPlan {
  const included = orders.filter((order) => includeUnconfirmed || order.confirmed)
  const consolidation = consolidateForSupplier(included)
  const nameById = new Map(customers.map((customer) => [customer.id, customer.name]))

  // Product key -> customer id -> what that customer asked for.
  const buyers = new Map<string, Map<string, LineCustomer>>()
  for (const order of included) {
    for (const item of order.items) {
      const key = normalizeName(item.name)
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
        confirmed: order.confirmed,
      })
    }
  }

  const lines: SupplierLine[] = consolidation.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    customers: [...(buyers.get(normalizeName(item.name))?.values() ?? [])].sort(
      (a, b) =>
        b.quantity - a.quantity || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
    ),
  }))

  let unconfirmedUnits = 0
  let unconfirmedOrders = 0
  for (const order of orders) {
    if (order.confirmed) continue
    unconfirmedOrders += 1
    for (const item of order.items) unconfirmedUnits += item.quantity
  }

  return { consolidation, lines, unconfirmedUnits, unconfirmedOrders }
}

/** "María, Ana y 3 más". Two names is as much as a row can hold. */
export function buyersLabel(customers: readonly LineCustomer[]): string {
  const names = customers.map((customer) => customer.name)
  if (names.length === 0) return ''
  if (names.length <= 2) return names.join(' y ')
  return `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`
}

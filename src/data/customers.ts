/**
 * Customer repository. Creating a customer asks for a name and nothing else:
 * anything more during a live is friction she cannot afford.
 */
import { db, newId } from '../db/db'
import type { Customer } from '../db/types'
import { contactsOf, matchesQuery, mergeCustomers } from '../domain/customers'
import { nowIso } from '../domain/dates'

export interface NewCustomer {
  name: string
  aliases?: string[]
  whatsapp?: string
  address?: string
}

export type CustomerPatch = Partial<Omit<Customer, 'id'>>

export async function get(id: string): Promise<Customer | undefined> {
  return db.customers.get(id)
}

export async function list(): Promise<Customer[]> {
  return sortByName(await db.customers.toArray())
}

/** Matches name, aliases and whatsapp. An empty query returns everybody. */
export async function search(query: string): Promise<Customer[]> {
  const all = await db.customers.toArray()
  return sortByName(all.filter((customer) => matchesQuery(customer, query)))
}

export async function create(input: NewCustomer): Promise<Customer> {
  const name = input.name.trim()
  if (!name) throw new Error('A customer needs a name')

  const customer: Customer = {
    id: newId(),
    name,
    aliases: input.aliases ?? [],
    contacts: [],
    ...(input.whatsapp ? { whatsapp: input.whatsapp } : {}),
    ...(input.address ? { address: input.address } : {}),
  }
  await db.customers.add(customer)
  return customer
}

export async function update(id: string, changes: CustomerPatch): Promise<Customer> {
  return db.transaction('rw', db.customers, async () => {
    const customer = await db.customers.get(id)
    if (!customer) throw new Error(`Unknown customer: ${id}`)
    const updated = { ...customer, ...changes, id }
    await db.customers.put(updated)
    return updated
  })
}

/**
 * One entry per message sent to the person rather than to an order. It is what
 * silences the reengage trigger, which has no order to write on.
 */
export async function recordContact(id: string, at: string = nowIso()): Promise<Customer> {
  return db.transaction('rw', db.customers, async () => {
    const customer = await db.customers.get(id)
    if (!customer) throw new Error(`Unknown customer: ${id}`)
    const updated = { ...customer, contacts: [...contactsOf(customer), at] }
    await db.customers.put(updated)
    return updated
  })
}

/**
 * Folds `sourceId` into `targetId`: aliases join, orders move, and two orders
 * of the same campaign become one. All of it in a single transaction, because
 * a half-applied merge would duplicate or lose money owed.
 */
export async function merge(targetId: string, sourceId: string): Promise<Customer> {
  if (targetId === sourceId) throw new Error('Cannot merge a customer into itself')

  return db.transaction('rw', db.customers, db.orders, async () => {
    const target = await db.customers.get(targetId)
    if (!target) throw new Error(`Unknown customer: ${targetId}`)
    const source = await db.customers.get(sourceId)
    if (!source) throw new Error(`Unknown customer: ${sourceId}`)

    const related = await db.orders.where('customerId').anyOf([targetId, sourceId]).toArray()
    const { customer, orders, removedOrderIds } = mergeCustomers(target, source, related)

    await db.customers.put(customer)
    await db.customers.delete(sourceId)
    if (removedOrderIds.length > 0) await db.orders.bulkDelete(removedOrderIds)
    if (orders.length > 0) await db.orders.bulkPut(orders)
    return customer
  })
}

export async function remove(id: string): Promise<void> {
  await db.customers.delete(id)
}

function sortByName(customers: Customer[]): Customer[] {
  return customers.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
}

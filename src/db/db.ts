import Dexie, { type EntityTable } from 'dexie'
import type { Campaign, CampaignProduct, Customer, Order, OrderItem, Setting } from './types'
import { productKey, splitProductCode } from '../domain/text'

export class SalesDatabase extends Dexie {
  campaigns!: EntityTable<Campaign, 'id'>
  customers!: EntityTable<Customer, 'id'>
  orders!: EntityTable<Order, 'id'>
  campaignProducts!: EntityTable<CampaignProduct, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor(name = 'oriflame-sales') {
    super(name)
    this.version(1).stores({
      // `active` is deliberately NOT indexed: IndexedDB cannot use a boolean
      // as a key, so the index would silently match nothing. getActive scans.
      campaigns: 'id, cutoffDate',
      customers: 'id, name, *aliases',
      orders: 'id, campaignId, customerId, [campaignId+customerId], confirmed',
      settings: 'key',
    })

    /**
     * v2: the confirmation goes away, the code comes out of the name, and the
     * campaign gets a product table.
     *
     * Written to be idempotent. A migration on money data that only works the
     * first time is a migration that cannot be re-run after a restore.
     */
    this.version(2)
      .stores({
        campaigns: 'id, cutoffDate',
        customers: 'id, name, *aliases',
        orders: 'id, campaignId, customerId, [campaignId+customerId]',
        campaignProducts: 'id, campaignId, code, [campaignId+code]',
        settings: 'key',
      })
      .upgrade(async (tx) => {
        const orders = await tx.table<Order>('orders').toArray()
        const products = new Map<string, CampaignProduct>()
        const prices = new Map<string, Map<number, number>>()

        for (const order of orders) {
          const mutable = order as Order & { confirmed?: boolean }
          delete mutable.confirmed
          order.items = order.items.map((item) => migrateItem(item, order.campaignId, products, prices))
          await tx.table('orders').put(order)
        }

        for (const [id, product] of products) {
          const votes = prices.get(id)
          const price = votes ? mostVoted(votes) : undefined
          await tx.table('campaignProducts').put(price === undefined ? product : { ...product, price })
        }
      })

    /**
     * v3: repair the lines the old, stricter code rule left broken.
     *
     * The field she types into accepted four-digit codes and the parser only
     * accepted five, so "7898 Bálsamo" was stored with a code and "7898" on its
     * own was stored as a nameless line without one. Same product, two lines,
     * counted twice on the pedido and ordered twice from Oriflame. The rule is
     * now shared; this re-splits what was written under the old one and folds
     * the duplicates back together.
     */
    this.version(3).upgrade(async (tx) => {
      const orders = await tx.table<Order>('orders').toArray()
      const products = new Map<string, CampaignProduct>()

      for (const order of orders) {
        const repaired = mergeDuplicates(order.items.map(reSplit))
        for (const item of repaired) {
          if (!item.code) continue
          const id = `${order.campaignId}:${item.code}`
          if (!products.has(id)) {
            products.set(id, { id, campaignId: order.campaignId, code: item.code, name: item.name })
          }
        }
        if (sameItems(order.items, repaired)) continue
        await tx.table('orders').put({ ...order, items: repaired })
      }

      for (const [id, product] of products) {
        const known = await tx.table('campaignProducts').get(id)
        if (!known) await tx.table('campaignProducts').put(product)
      }
    })
  }
}

/** Runs the current code rule over a line that was written under an older one. */
function reSplit(item: OrderItem): OrderItem {
  if (item.code) return item
  const split = splitProductCode(item.name)
  if (!split.code) return item
  return { ...item, code: split.code, name: split.name }
}

/**
 * One line per product. The quantities add up; a real price beats an absent
 * one, and a real name beats a code standing in for itself.
 */
function mergeDuplicates(items: readonly OrderItem[]): OrderItem[] {
  const merged: OrderItem[] = []
  for (const item of items) {
    const key = productKey(item)
    const existing = merged.find((candidate) => productKey(candidate) === key)
    if (!existing) {
      merged.push({ ...item })
      continue
    }
    existing.quantity += item.quantity
    if (existing.price === undefined && item.price !== undefined) existing.price = item.price
    if (existing.name === existing.code && item.name !== item.code) existing.name = item.name
  }
  return merged
}

function sameItems(before: readonly OrderItem[], after: readonly OrderItem[]): boolean {
  if (before.length !== after.length) return false
  return before.every((item, index) => {
    const other = after[index]
    return (
      other !== undefined &&
      item.code === other.code &&
      item.name === other.name &&
      item.quantity === other.quantity &&
      item.price === other.price
    )
  })
}

type MigratedItem = { code?: string; name: string; quantity: number; price?: number }

/**
 * Splits the code out of a free-text name and remembers what that product cost
 * in that campaign. A price of zero was the old way of saying "not known yet",
 * so it becomes absent rather than a real zero.
 */
function migrateItem(
  item: MigratedItem,
  campaignId: string,
  products: Map<string, CampaignProduct>,
  prices: Map<string, Map<number, number>>,
): MigratedItem {
  const { code, name } = item.code ? { code: item.code, name: item.name } : splitProductCode(item.name)
  const price = item.price === undefined || item.price === 0 ? undefined : item.price
  const migrated: MigratedItem = { name, quantity: item.quantity }
  if (code) migrated.code = code
  if (price !== undefined) migrated.price = price
  if (!code) return migrated

  const id = `${campaignId}:${code}`
  if (!products.has(id)) products.set(id, { id, campaignId, code, name })
  if (price !== undefined) {
    const votes = prices.get(id) ?? new Map<number, number>()
    votes.set(price, (votes.get(price) ?? 0) + 1)
    prices.set(id, votes)
  }
  return migrated
}

/** The price the campaign actually sold at, which is the one seen most often. */
function mostVoted(votes: Map<number, number>): number | undefined {
  let best: number | undefined
  let bestCount = 0
  for (const [price, count] of votes) {
    if (count > bestCount || (count === bestCount && best !== undefined && price > best)) {
      best = price
      bestCount = count
    }
  }
  return best
}

export const db = new SalesDatabase()

export function newId(): string {
  return crypto.randomUUID()
}

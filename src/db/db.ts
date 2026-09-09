import Dexie, { type EntityTable } from 'dexie'
import type { Campaign, CampaignProduct, Customer, Order, Setting } from './types'
import { splitProductCode } from '../domain/text'

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
  }
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

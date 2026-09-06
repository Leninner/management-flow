import Dexie, { type EntityTable } from 'dexie'
import type { Campaign, Customer, Order, Setting } from './types'

export class SalesDatabase extends Dexie {
  campaigns!: EntityTable<Campaign, 'id'>
  customers!: EntityTable<Customer, 'id'>
  orders!: EntityTable<Order, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor(name = 'oriflame-sales') {
    super(name)
    this.version(1).stores({
      campaigns: 'id, active, cutoffDate',
      customers: 'id, name, *aliases',
      orders: 'id, campaignId, customerId, [campaignId+customerId], confirmed',
      settings: 'key',
    })
  }
}

export const db = new SalesDatabase()

export function newId(): string {
  return crypto.randomUUID()
}

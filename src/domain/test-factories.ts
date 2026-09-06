/**
 * Fixtures shared by the domain and data tests. Never imported by app code.
 */
import type { Campaign, Customer, Order, OrderItem } from '../db/types'

export function makeCampaign(patch: Partial<Campaign> = {}): Campaign {
  return { id: 'camp-13', name: 'C13-2026', cutoffDate: '2026-09-20', active: true, ...patch }
}

export function makeCustomer(patch: Partial<Customer> = {}): Customer {
  return { id: 'cus-1', name: 'María Fernanda', aliases: [], contacts: [], ...patch }
}

export function makeItem(patch: Partial<OrderItem> = {}): OrderItem {
  return { name: '38588 Novage', quantity: 1, price: 12.9, ...patch }
}

export function makeOrder(patch: Partial<Order> = {}): Order {
  return {
    id: 'ord-1',
    campaignId: 'camp-13',
    customerId: 'cus-1',
    items: [],
    paidAmount: 0,
    shippingCost: 0,
    confirmed: false,
    contacts: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    ...patch,
  }
}

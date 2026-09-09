/**
 * Fixtures shared by the domain and data tests. Never imported by app code.
 */
import type { Campaign, CampaignProduct, Customer, Order, OrderItem } from '../db/types'
import { splitProductCode } from './text'

export function makeCampaign(patch: Partial<Campaign> = {}): Campaign {
  return { id: 'camp-13', name: 'C13-2026', cutoffDate: '2026-09-20', active: true, ...patch }
}

export function makeCustomer(patch: Partial<Customer> = {}): Customer {
  return { id: 'cus-1', name: 'María Fernanda', aliases: [], contacts: [], ...patch }
}

/**
 * A fixture written as `makeItem({ name: '42102 Labial' })` means the code is
 * inside the name, exactly like a line she types. Splitting it here keeps every
 * test readable and stops two different products sharing a default code.
 */
export function makeItem(patch: Partial<OrderItem> = {}): OrderItem {
  const { code, name, ...rest } = patch
  const split =
    name === undefined
      ? { code: code ?? '38588', name: 'Novage' }
      : code !== undefined
        ? { code, name }
        : splitProductCode(name)
  return {
    ...(split.code ? { code: split.code } : {}),
    name: split.name,
    quantity: 1,
    price: 12.9,
    ...rest,
  }
}

export function makeCampaignProduct(patch: Partial<CampaignProduct> = {}): CampaignProduct {
  const campaignId = patch.campaignId ?? 'camp-13'
  const code = patch.code ?? '38588'
  return { id: `${campaignId}:${code}`, campaignId, code, name: 'Novage', ...patch }
}

export function makeOrder(patch: Partial<Order> = {}): Order {
  return {
    id: 'ord-1',
    campaignId: 'camp-13',
    customerId: 'cus-1',
    items: [],
    paidAmount: 0,
    shippingCost: 0,
    contacts: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    ...patch,
  }
}

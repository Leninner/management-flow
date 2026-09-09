/**
 * The v1 -> v2 upgrade, run against a real v1 database.
 *
 * This is money data with no undo: the only copy of who owes what lives in one
 * phone. So it is tested end to end rather than by calling the helper, and it
 * is tested twice in a row, because a migration that only works the first time
 * cannot be re-run after a restore.
 */
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { SalesDatabase } from './db'
import type { CampaignProduct, Order } from './types'

const NAME = 'migration-test'

async function seedVersionOne(): Promise<void> {
  const legacy = new Dexie(NAME)
  legacy.version(1).stores({
    campaigns: 'id, cutoffDate',
    customers: 'id, name, *aliases',
    orders: 'id, campaignId, customerId, [campaignId+customerId], confirmed',
    settings: 'key',
  })
  await legacy.open()
  await legacy.table('campaigns').add({
    id: 'camp-13',
    name: 'C13-2026',
    cutoffDate: '2026-09-20',
    active: true,
  })
  await legacy.table('orders').bulkAdd([
    {
      id: 'ord-1',
      campaignId: 'camp-13',
      customerId: 'cus-1',
      items: [
        { name: '38588 Novage Ecollagen', quantity: 2, price: 12.9 },
        // Zero was v1's way of saying "no price yet", never a free product.
        { name: 'Muestra de perfume', quantity: 1, price: 0 },
        // The four-digit code the old rule refused to recognise, written both
        // ways: once with its name and once on its own.
        { name: '7898 Bálsamo', quantity: 1, price: 45 },
        { name: '7898', quantity: 1, price: 0 },
      ],
      paidAmount: 0,
      shippingCost: 0,
      confirmed: false,
      contacts: [],
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'ord-2',
      campaignId: 'camp-13',
      customerId: 'cus-2',
      items: [{ name: '38588 novage ecollagen', quantity: 1, price: 12.9 }],
      paidAmount: 5,
      shippingCost: 0,
      confirmed: true,
      contacts: [],
      createdAt: '2026-09-02T00:00:00.000Z',
    },
  ])
  legacy.close()
}

async function openVersionTwo(): Promise<SalesDatabase> {
  const upgraded = new SalesDatabase(NAME)
  await upgraded.open()
  return upgraded
}

afterEach(async () => {
  await Dexie.delete(NAME)
})

describe('the v1 to v2 upgrade', () => {
  it('drops the confirmation from every order', async () => {
    await seedVersionOne()
    const upgraded = await openVersionTwo()
    const all = await upgraded.orders.toArray()
    for (const order of all) expect(order).not.toHaveProperty('confirmed')
    upgraded.close()
  })

  it('pulls the Oriflame code out of the name and leaves the rest whole', async () => {
    await seedVersionOne()
    const upgraded = await openVersionTwo()
    const order = (await upgraded.orders.get('ord-1')) as Order
    expect(order.items.slice(0, 2)).toEqual([
      { code: '38588', name: 'Novage Ecollagen', quantity: 2, price: 12.9 },
      { name: 'Muestra de perfume', quantity: 1 },
    ])
    upgraded.close()
  })

  it('folds a code written both ways back into one line', async () => {
    await seedVersionOne()
    const upgraded = await openVersionTwo()
    const order = (await upgraded.orders.get('ord-1')) as Order
    // Two units of one product, the name kept over the code standing in for
    // itself and the real price kept over the absent one.
    expect(order.items.filter((item) => item.code === '7898')).toEqual([
      { code: '7898', name: 'Bálsamo', quantity: 2, price: 45 },
    ])
    upgraded.close()
  })

  it('never turns "no price yet" into a real zero', async () => {
    await seedVersionOne()
    const upgraded = await openVersionTwo()
    const order = (await upgraded.orders.get('ord-1')) as Order
    expect(order.items[1]?.price).toBeUndefined()
    upgraded.close()
  })

  it('seeds the campaign catalogue with the price the product actually sold at', async () => {
    await seedVersionOne()
    const upgraded = await openVersionTwo()
    const products = await upgraded.campaignProducts.toArray()
    expect(products).toEqual<CampaignProduct[]>([
      {
        id: 'camp-13:38588',
        campaignId: 'camp-13',
        code: '38588',
        name: 'Novage Ecollagen',
        price: 12.9,
      },
      { id: 'camp-13:7898', campaignId: 'camp-13', code: '7898', name: 'Bálsamo', price: 45 },
    ])
    upgraded.close()
  })

  it('is idempotent: reopening changes nothing', async () => {
    await seedVersionOne()
    const first = await openVersionTwo()
    const ordersAfterFirst = await first.orders.toArray()
    const productsAfterFirst = await first.campaignProducts.toArray()
    first.close()

    const second = await openVersionTwo()
    await expect(second.orders.toArray()).resolves.toEqual(ordersAfterFirst)
    await expect(second.campaignProducts.toArray()).resolves.toEqual(productsAfterFirst)
    second.close()
  })
})

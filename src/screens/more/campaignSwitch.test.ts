import { beforeEach, describe, expect, it } from 'vitest'
import { orders } from '../../data'
import { resetDatabase } from '../../data/test-db'
import { db } from '../../db/db'
import { makeItem, makeOrder } from '../../domain/test-factories'
import { discardOpenOrders } from './campaignSwitch'

const OLD = 'camp-13'

beforeEach(async () => {
  await resetDatabase()
  await db.orders.bulkAdd([
    makeOrder({
      id: 'o1',
      campaignId: OLD,
      customerId: 'u1',
      paidAmount: 9.5,
      items: [makeItem({ code: '38588', name: 'Novage', quantity: 1 })],
    }),
    makeOrder({
      id: 'o2',
      campaignId: OLD,
      customerId: 'u2',
      items: [makeItem({ code: '42102', name: 'Labial', quantity: 2, price: 9.5 })],
    }),
  ])
})

describe('discardOpenOrders', () => {
  it('deletes the ones nobody has paid or received and keeps the rest', async () => {
    await expect(discardOpenOrders(OLD)).resolves.toBe(1)
    const left = await orders.listByCampaign(OLD)
    expect(left.map((order) => order.id)).toEqual(['o1'])
  })

  it('does nothing to a campaign where everything has started', async () => {
    await db.orders.update('o2', { deliveredAt: '2026-09-10T00:00:00.000Z' })
    await expect(discardOpenOrders(OLD)).resolves.toBe(0)
    await expect(orders.listByCampaign(OLD)).resolves.toHaveLength(2)
  })
})

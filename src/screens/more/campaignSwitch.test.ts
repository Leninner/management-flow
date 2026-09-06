import { beforeEach, describe, expect, it } from 'vitest'
import { orders } from '../../data'
import { resetDatabase } from '../../data/test-db'
import { db } from '../../db/db'
import { makeItem, makeOrder } from '../../domain/test-factories'
import { discardUnconfirmedOrders } from './campaignSwitch'

const OLD = 'camp-13'

beforeEach(async () => {
  await resetDatabase()
  await db.orders.bulkAdd([
    makeOrder({
      id: 'o1',
      campaignId: OLD,
      customerId: 'u1',
      confirmed: true,
      items: [makeItem({ name: '38588 Novage', quantity: 1 })],
    }),
    makeOrder({
      id: 'o2',
      campaignId: OLD,
      customerId: 'u2',
      confirmed: false,
      items: [makeItem({ name: '42102 Labial', quantity: 2, price: 9.5 })],
    }),
  ])
})

describe('discardUnconfirmedOrders', () => {
  it('deletes the unconfirmed ones and keeps what she already confirmed', async () => {
    await expect(discardUnconfirmedOrders(OLD)).resolves.toBe(1)
    const left = await orders.listByCampaign(OLD)
    expect(left.map((order) => order.id)).toEqual(['o1'])
  })

  it('does nothing to a campaign where everything is confirmed', async () => {
    await db.orders.update('o2', { confirmed: true })
    await expect(discardUnconfirmedOrders(OLD)).resolves.toBe(0)
    await expect(orders.listByCampaign(OLD)).resolves.toHaveLength(2)
  })
})

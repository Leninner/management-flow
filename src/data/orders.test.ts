import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import type { Order } from '../db/types'
import * as orders from './orders'
import { resetDatabase } from './test-db'

const CAMPAIGN = 'camp-13'
const CUSTOMER = 'cus-1'

beforeEach(resetDatabase)

describe('addItem', () => {
  it('creates the order the first time the customer buys in the campaign', async () => {
    const order = await orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: '38588 Novage', quantity: 2, price: 12.9 },
    })

    expect(order).toMatchObject({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      items: [{ name: '38588 Novage', quantity: 2, price: 12.9 }],
      paidAmount: 0,
      shippingCost: 0,
      confirmed: false,
      contacts: [],
    })
    expect(order.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    await expect(db.orders.count()).resolves.toBe(1)
  })

  it('defaults the quantity to one and the price to zero', async () => {
    const order = await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Nuevo' } })
    expect(order.items).toEqual([{ name: 'Nuevo', quantity: 1, price: 0 }])
  })

  it('rejects an item without a name', async () => {
    await expect(
      orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: '   ' } }),
    ).rejects.toThrow()
  })

  it('never creates a second order for the same customer in the same campaign', async () => {
    await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Labial', price: 7 } })
    const order = await orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: 'Crema', price: 9 },
    })

    await expect(db.orders.count()).resolves.toBe(1)
    expect(order.items).toEqual([
      { name: 'Labial', quantity: 1, price: 7 },
      { name: 'Crema', quantity: 1, price: 9 },
    ])
  })

  it('merges the same product into a single line, keeping the price already quoted', async () => {
    await orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: '38588 Novage', quantity: 2, price: 12.9 },
    })
    const order = await orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: '  38588 NOVAGE ', quantity: 1, price: 14.5 },
    })

    expect(order.items).toEqual([{ name: '38588 Novage', quantity: 3, price: 12.9 }])
  })

  it('fills in a price that was left at zero during the live', async () => {
    await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Nuevo' } })
    const order = await orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: 'Nuevo', price: 8.5 },
    })
    expect(order.items).toEqual([{ name: 'Nuevo', quantity: 2, price: 8.5 }])
  })

  it('keeps a separate order per customer and per campaign', async () => {
    await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Labial' } })
    await orders.addItem({ campaignId: CAMPAIGN, customerId: 'cus-2', item: { name: 'Labial' } })
    await orders.addItem({ campaignId: 'camp-12', customerId: CUSTOMER, item: { name: 'Labial' } })
    await expect(db.orders.count()).resolves.toBe(3)
  })

  it('still writes a single order when two items are captured concurrently', async () => {
    await Promise.all([
      orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Labial', price: 7 } }),
      orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Crema', price: 9 } }),
    ])

    const stored = await db.orders.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.items.map((item) => item.name).sort()).toEqual(['Crema', 'Labial'])
  })

  it('sums the quantity when the same product is captured concurrently', async () => {
    await Promise.all([
      orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Labial', price: 7 } }),
      orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Labial', price: 7 } }),
      orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Labial', price: 7 } }),
    ])

    const stored = await db.orders.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.items).toEqual([{ name: 'Labial', quantity: 3, price: 7 }])
  })
})

describe('recordPayment', () => {
  it('adds to what the customer already paid, in exact cents', async () => {
    const created = await orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: 'Labial', price: 20 },
    })
    await orders.recordPayment(created.id, 0.1)
    const order = await orders.recordPayment(created.id, 0.2)
    expect(order.paidAmount).toBe(0.3)
  })

  it('refuses a payment that would leave a negative paid amount', async () => {
    const created = await orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: 'Labial', price: 20 },
    })
    await expect(orders.recordPayment(created.id, -5)).rejects.toThrow()
  })

  it('throws for an order that does not exist', async () => {
    await expect(orders.recordPayment('nope', 5)).rejects.toThrow()
  })
})

describe('the rest of the order lifecycle', () => {
  async function seed() {
    return orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: 'Labial', quantity: 2, price: 7 },
    })
  }

  it('sets the shipping cost and refuses a negative one', async () => {
    const created = await seed()
    const order = await orders.setShippingCost(created.id, 4.5)
    expect(order.shippingCost).toBe(4.5)
    await expect(orders.setShippingCost(created.id, -1)).rejects.toThrow()
  })

  it('confirms and unconfirms an order', async () => {
    const created = await seed()
    await expect(orders.markConfirmed(created.id)).resolves.toMatchObject({ confirmed: true })
    await expect(orders.markConfirmed(created.id, false)).resolves.toMatchObject({ confirmed: false })
  })

  it('marks the order delivered with an ISO date', async () => {
    const created = await seed()
    const order = await orders.markDelivered(created.id, '2026-09-22T00:00:00.000Z')
    expect(order.deliveredAt).toBe('2026-09-22T00:00:00.000Z')
    const now = await orders.markDelivered(created.id)
    expect(now.deliveredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('pushes one date per "ya le escribí"', async () => {
    const created = await seed()
    await orders.recordContact(created.id, '2026-09-06T00:00:00.000Z')
    const order = await orders.recordContact(created.id)
    expect(order.contacts).toHaveLength(2)
    expect(order.contacts[0]).toBe('2026-09-06T00:00:00.000Z')
    expect(order.contacts[1]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('removes one item and leaves the rest', async () => {
    const created = await seed()
    await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Crema', price: 9 } })
    const order = await orders.removeItem(created.id, 0)
    expect(order.items).toEqual([{ name: 'Crema', quantity: 1, price: 9 }])
  })

  it('refuses to remove an item that is not there', async () => {
    const created = await seed()
    await expect(orders.removeItem(created.id, 5)).rejects.toThrow()
  })

  it('deletes a cancelled order', async () => {
    const created = await seed()
    await orders.remove(created.id)
    await expect(db.orders.count()).resolves.toBe(0)
  })
})

describe('reads', () => {
  it('finds the single order of a customer in a campaign', async () => {
    const created = await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Labial' } })
    await expect(orders.findFor(CAMPAIGN, CUSTOMER)).resolves.toMatchObject({ id: created.id })
    await expect(orders.findFor(CAMPAIGN, 'cus-9')).resolves.toBeUndefined()
  })

  it('lists by campaign and by customer', async () => {
    await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Labial' } })
    await orders.addItem({ campaignId: 'camp-12', customerId: CUSTOMER, item: { name: 'Crema' } })
    await orders.addItem({ campaignId: CAMPAIGN, customerId: 'cus-2', item: { name: 'Crema' } })

    await expect(orders.listByCampaign(CAMPAIGN)).resolves.toHaveLength(2)
    await expect(orders.listByCustomer(CUSTOMER)).resolves.toHaveLength(2)
    await expect(orders.listAll()).resolves.toHaveLength(3)
  })
})

describe('moveUnconfirmed', () => {
  const NEXT = 'camp-14'

  beforeEach(async () => {
    await db.campaigns.add({ id: CAMPAIGN, name: 'C13-2026', cutoffDate: '2026-09-20', active: false })
    await db.campaigns.add({ id: NEXT, name: 'C14-2026', cutoffDate: '2026-10-10', active: true })
  })

  it('carries the unconfirmed orders forward and leaves the confirmed ones behind', async () => {
    const carried = await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Labial' } })
    const stays = await orders.addItem({ campaignId: CAMPAIGN, customerId: 'cus-2', item: { name: 'Crema' } })
    await orders.markConfirmed(stays.id)

    await expect(orders.moveUnconfirmed(CAMPAIGN, NEXT)).resolves.toBe(1)

    await expect(db.orders.get(carried.id)).resolves.toMatchObject({ campaignId: NEXT })
    await expect(db.orders.get(stays.id)).resolves.toMatchObject({ campaignId: CAMPAIGN })
    await expect(db.orders.count()).resolves.toBe(2)
  })

  it('keeps the order intact: items, money, notes, contacts and the creation date', async () => {
    const created = await orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: '38588 Novage', quantity: 2, price: 12.9 },
    })
    await orders.recordPayment(created.id, 5.5)
    await orders.setShippingCost(created.id, 3.25)
    await orders.setNotes(created.id, 'manda por Servientrega')
    await orders.recordContact(created.id, '2026-09-06T00:00:00.000Z')

    await orders.moveUnconfirmed(CAMPAIGN, NEXT)

    await expect(db.orders.get(created.id)).resolves.toEqual({
      id: created.id,
      campaignId: NEXT,
      customerId: CUSTOMER,
      items: [{ name: '38588 Novage', quantity: 2, price: 12.9 }],
      paidAmount: 5.5,
      shippingCost: 3.25,
      confirmed: false,
      contacts: ['2026-09-06T00:00:00.000Z'],
      createdAt: created.createdAt,
      notes: 'manda por Servientrega',
    })
  })

  it('merges into the order the customer already has in the target campaign', async () => {
    const carried = await orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: 'Labial', quantity: 1, price: 7 },
    })
    await orders.recordPayment(carried.id, 5)

    const waiting = await orders.addItem({
      campaignId: NEXT,
      customerId: CUSTOMER,
      item: { name: 'labial', quantity: 2, price: 8 },
    })
    await orders.addItem({ campaignId: NEXT, customerId: CUSTOMER, item: { name: 'Crema', quantity: 1, price: 9 } })
    await orders.recordPayment(waiting.id, 3)
    await orders.setShippingCost(waiting.id, 2)

    await expect(orders.moveUnconfirmed(CAMPAIGN, NEXT)).resolves.toBe(1)

    await expect(db.orders.count()).resolves.toBe(1)
    await expect(db.orders.get(carried.id)).resolves.toBeUndefined()
    await expect(db.orders.get(waiting.id)).resolves.toMatchObject({
      campaignId: NEXT,
      items: [
        { name: 'labial', quantity: 3, price: 8 },
        { name: 'Crema', quantity: 1, price: 9 },
      ],
      paidAmount: 8,
      shippingCost: 2,
    })
  })

  it('returns zero when there is nothing to carry', async () => {
    await expect(orders.moveUnconfirmed(CAMPAIGN, NEXT)).resolves.toBe(0)
  })

  it('refuses to move a campaign into itself', async () => {
    await expect(orders.moveUnconfirmed(CAMPAIGN, CAMPAIGN)).rejects.toThrow()
  })

  it('refuses an unknown target campaign and changes nothing', async () => {
    const created = await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Labial' } })
    await expect(orders.moveUnconfirmed(CAMPAIGN, 'nope')).rejects.toThrow()
    await expect(db.orders.get(created.id)).resolves.toMatchObject({ campaignId: CAMPAIGN })
  })

  it('leaves everything untouched when a write fails halfway', async () => {
    const carried = await orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: 'Labial', price: 7 },
    })
    const waiting = await orders.addItem({ campaignId: NEXT, customerId: CUSTOMER, item: { name: 'Crema', price: 9 } })

    const failing = vi.spyOn(db.orders, 'bulkDelete').mockRejectedValueOnce(new Error('disk went away'))
    await expect(orders.moveUnconfirmed(CAMPAIGN, NEXT)).rejects.toThrow('disk went away')
    failing.mockRestore()

    await expect(db.orders.count()).resolves.toBe(2)
    await expect(db.orders.get(carried.id)).resolves.toMatchObject({ campaignId: CAMPAIGN, items: [{ name: 'Labial', quantity: 1, price: 7 }] })
    await expect(db.orders.get(waiting.id)).resolves.toMatchObject({ items: [{ name: 'Crema', quantity: 1, price: 9 }] })
  })
})

describe('editing an item in place', () => {
  async function seedTwoLines() {
    const created = await orders.addItem({
      campaignId: CAMPAIGN,
      customerId: CUSTOMER,
      item: { name: 'Labial', quantity: 2, price: 7 },
    })
    await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Crema', quantity: 1, price: 9 } })
    return created
  }

  describe('setItemQuantity', () => {
    it('changes the quantity and leaves the price alone', async () => {
      const created = await seedTwoLines()
      const order = await orders.setItemQuantity(created.id, 'Labial', 5)
      expect(order.items).toEqual([
        { name: 'Labial', quantity: 5, price: 7 },
        { name: 'Crema', quantity: 1, price: 9 },
      ])
    })

    it('keeps the line where it was instead of sending it to the end', async () => {
      const created = await seedTwoLines()
      await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Rímel', price: 11 } })
      const order = await orders.setItemQuantity(created.id, 'Labial', 4)
      expect(order.items.map((item) => item.name)).toEqual(['Labial', 'Crema', 'Rímel'])
    })

    it('finds the line the same way a capture does, trimmed and ignoring case', async () => {
      const created = await orders.addItem({
        campaignId: CAMPAIGN,
        customerId: CUSTOMER,
        item: { name: '38588 Novage', quantity: 1, price: 12.9 },
      })
      const order = await orders.setItemQuantity(created.id, '  38588 NOVAGE ', 3)
      expect(order.items).toEqual([{ name: '38588 Novage', quantity: 3, price: 12.9 }])
    })

    it('removes the line when the quantity drops to zero', async () => {
      const created = await seedTwoLines()
      const order = await orders.setItemQuantity(created.id, 'Labial', 0)
      expect(order.items).toEqual([{ name: 'Crema', quantity: 1, price: 9 }])
    })

    it('leaves an empty order behind when the last line goes, exactly like removeItem', async () => {
      const created = await orders.addItem({ campaignId: CAMPAIGN, customerId: CUSTOMER, item: { name: 'Labial' } })
      const order = await orders.setItemQuantity(created.id, 'Labial', 0)
      expect(order.items).toEqual([])
      await expect(db.orders.get(created.id)).resolves.toMatchObject({ items: [] })
    })

    it('refuses a negative quantity', async () => {
      const created = await seedTwoLines()
      await expect(orders.setItemQuantity(created.id, 'Labial', -1)).rejects.toThrow()
    })

    it('throws for an unknown order and for a line that is not there', async () => {
      const created = await seedTwoLines()
      await expect(orders.setItemQuantity('nope', 'Labial', 1)).rejects.toThrow()
      await expect(orders.setItemQuantity(created.id, 'Perfume', 1)).rejects.toThrow()
    })
  })

  describe('setItemPrice', () => {
    it('changes the price, keeping the quantity and the position', async () => {
      const created = await seedTwoLines()
      const order = await orders.setItemPrice(created.id, 'Labial', 8.5)
      expect(order.items).toEqual([
        { name: 'Labial', quantity: 2, price: 8.5 },
        { name: 'Crema', quantity: 1, price: 9 },
      ])
    })

    it('accepts a price of zero for a product still without one', async () => {
      const created = await seedTwoLines()
      const order = await orders.setItemPrice(created.id, 'Labial', 0)
      expect(order.items[0]).toEqual({ name: 'Labial', quantity: 2, price: 0 })
    })

    it('refuses a negative price', async () => {
      const created = await seedTwoLines()
      await expect(orders.setItemPrice(created.id, 'Labial', -1)).rejects.toThrow()
    })

    it('throws for an unknown order and for a line that is not there', async () => {
      const created = await seedTwoLines()
      await expect(orders.setItemPrice('nope', 'Labial', 1)).rejects.toThrow()
      await expect(orders.setItemPrice(created.id, 'Perfume', 1)).rejects.toThrow()
    })
  })

  describe('when the write is interrupted', () => {
    /** Rejects any write that carries the edited line, and lets the rest through. */
    function failTheWriteThatCarries(quantity: number) {
      const realPut = db.orders.put.bind(db.orders)
      return vi.spyOn(db.orders, 'put').mockImplementation(((order: Order) =>
        order.items.some((item) => item.quantity === quantity)
          ? Promise.reject(new Error('disk went away'))
          : realPut(order)) as typeof db.orders.put)
    }

    /** What the screen had to do before this API existed. Kept to prove the difference. */
    async function naiveSetItemQuantity(id: string, itemName: string, quantity: number): Promise<void> {
      const order = await db.orders.get(id)
      if (!order) throw new Error('missing order')
      const index = order.items.findIndex((item) => item.name === itemName)
      const line = order.items[index]
      if (!line) throw new Error('missing line')
      await orders.removeItem(id, index)
      await orders.addItem({
        campaignId: order.campaignId,
        customerId: order.customerId,
        item: { name: line.name, quantity, price: line.price },
      })
    }

    it('leaves the order exactly as it was', async () => {
      const created = await seedTwoLines()
      const before = await db.orders.get(created.id)

      const failing = failTheWriteThatCarries(5)
      await expect(orders.setItemQuantity(created.id, 'Labial', 5)).rejects.toThrow('disk went away')
      failing.mockRestore()

      await expect(db.orders.get(created.id)).resolves.toEqual(before)
    })

    it('loses the line under the remove-then-add version the screen used to run', async () => {
      const created = await seedTwoLines()

      const failing = failTheWriteThatCarries(5)
      await expect(naiveSetItemQuantity(created.id, 'Labial', 5)).rejects.toThrow('disk went away')
      failing.mockRestore()

      const order = await db.orders.get(created.id)
      expect(order?.items.map((item) => item.name)).toEqual(['Crema'])
    })
  })
})

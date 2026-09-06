import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { makeOrder } from '../domain/test-factories'
import * as customers from './customers'
import { resetDatabase } from './test-db'

beforeEach(resetDatabase)

describe('create', () => {
  it('only needs a name', async () => {
    const customer = await customers.create({ name: 'María Fernanda' })
    expect(customer).toMatchObject({ name: 'María Fernanda', aliases: [] })
    expect(customer.id).toBeTruthy()
    await expect(db.customers.get(customer.id)).resolves.toEqual(customer)
  })

  it('trims the name and refuses an empty one', async () => {
    await expect(customers.create({ name: '  Ana  ' })).resolves.toMatchObject({ name: 'Ana' })
    await expect(customers.create({ name: '   ' })).rejects.toThrow()
  })

  it('stores the optional identities', async () => {
    const customer = await customers.create({
      name: 'Ana',
      aliases: ['@anita'],
      whatsapp: '0987654321',
      address: 'Ambato',
    })
    expect(customer).toMatchObject({ aliases: ['@anita'], whatsapp: '0987654321', address: 'Ambato' })
  })
})

describe('search', () => {
  beforeEach(async () => {
    await customers.create({ name: 'Rosa', aliases: ['@rosita'] })
    await customers.create({ name: 'Ana', whatsapp: '0987654321' })
    await customers.create({ name: 'María Fernanda', aliases: ['@maria23'] })
  })

  it('returns everybody sorted by name when the query is empty', async () => {
    await expect(customers.search('')).resolves.toMatchObject([{ name: 'Ana' }, { name: 'María Fernanda' }, { name: 'Rosa' }])
  })

  it('finds a customer through an alias', async () => {
    await expect(customers.search('maria')).resolves.toMatchObject([{ name: 'María Fernanda' }])
  })

  it('finds a customer through the whatsapp number', async () => {
    await expect(customers.search('0987')).resolves.toMatchObject([{ name: 'Ana' }])
  })

  it('returns nothing when nobody matches', async () => {
    await expect(customers.search('perfume')).resolves.toEqual([])
  })
})

describe('update', () => {
  it('patches only the given fields', async () => {
    const customer = await customers.create({ name: 'Ana', aliases: ['@anita'] })
    const updated = await customers.update(customer.id, { whatsapp: '0987654321' })
    expect(updated).toMatchObject({ name: 'Ana', aliases: ['@anita'], whatsapp: '0987654321' })
  })

  it('throws for a customer that does not exist', async () => {
    await expect(customers.update('nope', { whatsapp: '1' })).rejects.toThrow()
  })
})

describe('merge', () => {
  it('keeps the target, deletes the source and moves the orders over', async () => {
    const target = await customers.create({ name: 'María Fernanda', aliases: ['@maria23'] })
    const source = await customers.create({ name: 'Mafer', whatsapp: '0987654321' })
    await db.orders.add(makeOrder({ id: 'o-source', customerId: source.id, campaignId: 'camp-12' }))

    const merged = await customers.merge(target.id, source.id)

    expect(merged).toMatchObject({ id: target.id, name: 'María Fernanda', whatsapp: '0987654321' })
    expect(merged.aliases).toEqual(['@maria23', 'Mafer'])
    await expect(db.customers.count()).resolves.toBe(1)
    await expect(db.orders.get('o-source')).resolves.toMatchObject({ customerId: target.id })
  })

  it('combines the two orders of the same campaign into one', async () => {
    const target = await customers.create({ name: 'María Fernanda' })
    const source = await customers.create({ name: 'Mafer' })
    await db.orders.add(
      makeOrder({
        id: 'o-target',
        customerId: target.id,
        campaignId: 'camp-13',
        items: [{ name: 'Labial', quantity: 1, price: 7 }],
        paidAmount: 5,
        shippingCost: 3,
      }),
    )
    await db.orders.add(
      makeOrder({
        id: 'o-source',
        customerId: source.id,
        campaignId: 'camp-13',
        items: [
          { name: 'labial', quantity: 2, price: 8 },
          { name: 'Crema', quantity: 1, price: 9 },
        ],
        paidAmount: 1,
        shippingCost: 2,
        confirmed: true,
      }),
    )

    await customers.merge(target.id, source.id)

    await expect(db.orders.count()).resolves.toBe(1)
    const order = await db.orders.get('o-target')
    expect(order).toMatchObject({
      customerId: target.id,
      items: [
        { name: 'Labial', quantity: 3, price: 7 },
        { name: 'Crema', quantity: 1, price: 9 },
      ],
      paidAmount: 6,
      shippingCost: 5,
      confirmed: true,
    })
  })

  it('refuses to merge a customer into itself or into a missing one', async () => {
    const target = await customers.create({ name: 'Ana' })
    await expect(customers.merge(target.id, target.id)).rejects.toThrow()
    await expect(customers.merge(target.id, 'nope')).rejects.toThrow()
  })
})

describe('the customer contact log', () => {
  it('starts empty on a new customer', async () => {
    await expect(customers.create({ name: 'Ana' })).resolves.toMatchObject({ contacts: [] })
  })

  it('pushes one date per message sent to the person', async () => {
    const customer = await customers.create({ name: 'Ana' })
    await customers.recordContact(customer.id, '2026-09-06T00:00:00.000Z')
    const updated = await customers.recordContact(customer.id)

    expect(updated.contacts).toHaveLength(2)
    expect(updated.contacts[0]).toBe('2026-09-06T00:00:00.000Z')
    expect(updated.contacts[1]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('throws for a customer that does not exist', async () => {
    await expect(customers.recordContact('nope')).rejects.toThrow()
  })

  it('starts a log for a customer stored before the field existed', async () => {
    await db.customers.add({ id: 'legacy', name: 'Rosa', aliases: [] } as unknown as Parameters<
      typeof db.customers.add
    >[0])
    const updated = await customers.recordContact('legacy', '2026-09-06T00:00:00.000Z')
    expect(updated.contacts).toEqual(['2026-09-06T00:00:00.000Z'])
  })

  it('joins both logs when two duplicates are merged', async () => {
    const target = await customers.create({ name: 'María Fernanda' })
    const source = await customers.create({ name: 'Mafer' })
    await customers.recordContact(target.id, '2026-09-04T00:00:00.000Z')
    await customers.recordContact(source.id, '2026-08-01T00:00:00.000Z')

    const merged = await customers.merge(target.id, source.id)

    expect(merged.contacts).toEqual(['2026-08-01T00:00:00.000Z', '2026-09-04T00:00:00.000Z'])
  })
})

describe('remove', () => {
  it('takes the orders of the customer with them', async () => {
    const customer = await customers.create({ name: 'Ana' })
    const other = await customers.create({ name: 'Rosa' })
    await db.orders.bulkAdd([
      makeOrder({ id: 'o-1', customerId: customer.id, campaignId: 'camp-12' }),
      makeOrder({ id: 'o-2', customerId: customer.id, campaignId: 'camp-13' }),
      makeOrder({ id: 'o-3', customerId: other.id, campaignId: 'camp-13' }),
    ])

    await customers.remove(customer.id)

    await expect(db.customers.get(customer.id)).resolves.toBeUndefined()
    await expect(db.orders.toArray()).resolves.toMatchObject([{ id: 'o-3' }])
  })

  it('does nothing loud for a customer with no orders or one that is already gone', async () => {
    const customer = await customers.create({ name: 'Ana' })
    await expect(customers.remove(customer.id)).resolves.toBeUndefined()
    await expect(customers.remove('nope')).resolves.toBeUndefined()
  })
})

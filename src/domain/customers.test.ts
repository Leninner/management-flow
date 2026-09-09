import { describe, expect, it } from 'vitest'
import { carriedDebt, matchesQuery, mergeCustomers } from './customers'
import { makeCustomer, makeItem, makeOrder } from './test-factories'

describe('matchesQuery', () => {
  it('matches everything when the query is blank', () => {
    expect(matchesQuery(makeCustomer(), '   ')).toBe(true)
  })

  it('matches the name ignoring case', () => {
    expect(matchesQuery(makeCustomer({ name: 'Ana Lucía' }), 'ANA')).toBe(true)
  })

  it('matches the name ignoring accents in either direction', () => {
    expect(matchesQuery(makeCustomer({ name: 'María Fernanda' }), 'maria')).toBe(true)
    expect(matchesQuery(makeCustomer({ name: 'Maria Fernanda' }), 'maría')).toBe(true)
  })

  it('finds a TikTok handle through the aliases', () => {
    const customer = makeCustomer({ name: 'Fernanda', aliases: ['@maria23'] })
    expect(matchesQuery(customer, 'maria')).toBe(true)
  })

  it('finds a customer by the start of the whatsapp number', () => {
    const customer = makeCustomer({ name: 'Ana', whatsapp: '0987654321' })
    expect(matchesQuery(customer, '0987')).toBe(true)
  })

  it('ignores separators inside a stored phone number', () => {
    const customer = makeCustomer({ name: 'Ana', whatsapp: '098-765-4321' })
    expect(matchesQuery(customer, '0987')).toBe(true)
  })

  it('does not match an unrelated query', () => {
    const customer = makeCustomer({ name: 'Ana', aliases: ['@anita'], whatsapp: '0987654321' })
    expect(matchesQuery(customer, 'rosa')).toBe(false)
  })
})

describe('mergeCustomers', () => {
  const target = makeCustomer({
    id: 'target',
    name: 'María Fernanda',
    aliases: ['@maria23'],
    whatsapp: '0987654321',
  })
  const source = makeCustomer({
    id: 'source',
    name: 'Mafer',
    aliases: ['@maria23', 'Mafercita'],
    address: 'Av. Cevallos y Mera',
  })

  it('keeps the target identity and folds the source name into the aliases', () => {
    const { customer } = mergeCustomers(target, source, [])
    expect(customer.id).toBe('target')
    expect(customer.name).toBe('María Fernanda')
    expect(customer.aliases).toEqual(['@maria23', 'Mafer', 'Mafercita'])
  })

  it('keeps the target contact details and fills only the empty ones from the source', () => {
    const { customer } = mergeCustomers(target, source, [])
    expect(customer.whatsapp).toBe('0987654321')
    expect(customer.address).toBe('Av. Cevallos y Mera')
  })

  it('does not let a non-empty source field overwrite the target', () => {
    const other = makeCustomer({ id: 'source', name: 'Mafer', whatsapp: '0999999999' })
    const { customer } = mergeCustomers(target, other, [])
    expect(customer.whatsapp).toBe('0987654321')
  })

  it('rewrites source orders that have no counterpart in the same campaign', () => {
    const sourceOrder = makeOrder({ id: 'o-source', customerId: 'source', campaignId: 'camp-12' })
    const { orders, removedOrderIds } = mergeCustomers(target, source, [sourceOrder])
    expect(orders).toHaveLength(1)
    expect(orders[0]?.id).toBe('o-source')
    expect(orders[0]?.customerId).toBe('target')
    expect(removedOrderIds).toEqual([])
  })

  it('combines two orders of the same campaign into the target order', () => {
    const targetOrder = makeOrder({
      id: 'o-target',
      customerId: 'target',
      campaignId: 'camp-13',
      items: [makeItem({ name: '38588 Novage', quantity: 2, price: 12.9 })],
      paidAmount: 5,
      shippingCost: 3,
      contacts: ['2026-09-03T00:00:00.000Z'],
      createdAt: '2026-09-02T00:00:00.000Z',
    })
    const sourceOrder = makeOrder({
      id: 'o-source',
      customerId: 'source',
      campaignId: 'camp-13',
      items: [
        makeItem({ name: '  38588 NOVAGE ', quantity: 1, price: 14.5 }),
        makeItem({ name: '42102 Labial', quantity: 4, price: 7 }),
      ],
      paidAmount: 0.1,
      shippingCost: 2,
      contacts: ['2026-09-01T00:00:00.000Z'],
      createdAt: '2026-09-01T00:00:00.000Z',
    })

    const { orders, removedOrderIds } = mergeCustomers(target, source, [targetOrder, sourceOrder])

    expect(removedOrderIds).toEqual(['o-source'])
    expect(orders).toHaveLength(1)
    const merged = orders[0]!
    expect(merged.id).toBe('o-target')
    expect(merged.customerId).toBe('target')
    expect(merged.items).toEqual([
      { code: '38588', name: 'Novage', quantity: 3, price: 12.9 },
      { code: '42102', name: 'Labial', quantity: 4, price: 7 },
    ])
    expect(merged.paidAmount).toBe(5.1)
    expect(merged.shippingCost).toBe(5)
    expect(merged.contacts).toEqual(['2026-09-01T00:00:00.000Z', '2026-09-03T00:00:00.000Z'])
    expect(merged.createdAt).toBe('2026-09-01T00:00:00.000Z')
  })

  it('keeps the later delivery date when both orders were delivered', () => {
    const targetOrder = makeOrder({ id: 'a', customerId: 'target', deliveredAt: '2026-09-02T00:00:00.000Z' })
    const sourceOrder = makeOrder({ id: 'b', customerId: 'source', deliveredAt: '2026-09-04T00:00:00.000Z' })
    const { orders } = mergeCustomers(target, source, [targetOrder, sourceOrder])
    expect(orders[0]?.deliveredAt).toBe('2026-09-04T00:00:00.000Z')
  })

  it('leaves the combined order pending when only one side was delivered', () => {
    const targetOrder = makeOrder({ id: 'a', customerId: 'target', deliveredAt: '2026-09-02T00:00:00.000Z' })
    const sourceOrder = makeOrder({ id: 'b', customerId: 'source' })
    const { orders } = mergeCustomers(target, source, [targetOrder, sourceOrder])
    expect(orders[0]?.deliveredAt).toBeUndefined()
  })

  it('ignores orders that belong to neither customer', () => {
    const foreign = makeOrder({ id: 'foreign', customerId: 'somebody-else' })
    const { orders } = mergeCustomers(target, source, [foreign])
    expect(orders).toEqual([])
  })
})

describe('carriedDebt', () => {
  it('adds up the balances of campaigns that are not the active one', () => {
    const orders = [
      makeOrder({ id: 'a', campaignId: 'camp-11', items: [makeItem({ price: 20, quantity: 1 })], paidAmount: 2 }),
      makeOrder({ id: 'b', campaignId: 'camp-12', items: [makeItem({ price: 10, quantity: 1 })] }),
      makeOrder({ id: 'c', campaignId: 'camp-13', items: [makeItem({ price: 50, quantity: 1 })] }),
    ]
    expect(carriedDebt(orders, 'camp-13')).toBe(28)
  })

  it('skips orders that are already settled', () => {
    const orders = [
      makeOrder({ id: 'a', campaignId: 'camp-11', items: [makeItem({ price: 20, quantity: 1 })], paidAmount: 20 }),
      makeOrder({ id: 'b', campaignId: 'camp-12', items: [makeItem({ price: 5, quantity: 1 })], paidAmount: 9 }),
    ]
    expect(carriedDebt(orders, 'camp-13')).toBe(0)
  })

  it('stays exact with cents that drift as floats', () => {
    const orders = [
      makeOrder({ id: 'a', campaignId: 'camp-11', items: [makeItem({ price: 0.1, quantity: 1 })] }),
      makeOrder({ id: 'b', campaignId: 'camp-12', items: [makeItem({ price: 0.2, quantity: 1 })] }),
    ]
    expect(carriedDebt(orders, 'camp-13')).toBe(0.3)
  })

  it('counts every campaign when there is no active one', () => {
    const orders = [makeOrder({ id: 'a', campaignId: 'camp-11', items: [makeItem({ price: 8, quantity: 1 })] })]
    expect(carriedDebt(orders)).toBe(8)
  })
})

describe('mergeCustomers and the customer contact log', () => {
  const target = makeCustomer({ id: 'target', name: 'María Fernanda', contacts: ['2026-09-04'] })
  const source = makeCustomer({ id: 'source', name: 'Mafer', contacts: ['2026-08-01', '2026-09-01'] })

  it('joins both contact logs in date order', () => {
    const { customer } = mergeCustomers(target, source, [])
    expect(customer.contacts).toEqual(['2026-08-01', '2026-09-01', '2026-09-04'])
  })

  it('survives a customer stored before the contact log existed', () => {
    const legacy = { id: 'source', name: 'Mafer', aliases: [] } as unknown as typeof source
    const { customer } = mergeCustomers(target, legacy, [])
    expect(customer.contacts).toEqual(['2026-09-04'])
  })
})

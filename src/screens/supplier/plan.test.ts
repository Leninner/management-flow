import { describe, expect, it } from 'vitest'
import { makeCustomer, makeItem, makeOrder } from '../../domain/test-factories'
import { buildSupplierPlan, buyersLabel } from './plan'

const maria = makeCustomer({ id: 'u1', name: 'María' })
const ana = makeCustomer({ id: 'u2', name: 'Ana' })
const people = [maria, ana]

const paid = makeOrder({
  id: 'o1',
  customerId: 'u1',
  paidAmount: 38.7,
  items: [makeItem({ code: '38588', name: 'Novage', quantity: 3, price: 12.9 })],
})

/** Nothing in yet: this is the money she fronts with her own card. */
const unpaid = makeOrder({
  id: 'o2',
  customerId: 'u2',
  items: [
    makeItem({ code: '38588', name: 'novage', quantity: 2, price: 12.9 }),
    makeItem({ code: '42102', name: 'Labial', quantity: 1, price: 7 }),
  ],
})

describe('buildSupplierPlan', () => {
  it('merges the same product across pedidos no matter how it was typed', () => {
    const plan = buildSupplierPlan([paid, unpaid], people)
    expect(plan.lines.map((line) => [line.code, line.quantity])).toEqual([
      ['38588', 5],
      ['42102', 1],
    ])
    expect(plan.consolidation.totalUnits).toBe(6)
    expect(plan.consolidation.customerCount).toBe(2)
  })

  it('names who is behind each line, biggest buyer first', () => {
    const plan = buildSupplierPlan([paid, unpaid], people)
    expect(plan.lines[0]?.customers).toEqual([
      { customerId: 'u1', name: 'María', quantity: 3, unpaid: false },
      { customerId: 'u2', name: 'Ana', quantity: 2, unpaid: true },
    ])
  })

  it('adds up what she is fronting for people who have put nothing in', () => {
    const plan = buildSupplierPlan([paid, unpaid], people)
    expect(plan.exposedOrders).toBe(1)
    expect(plan.exposedCents).toBe(3280)
  })

  it('survives a pedido whose customer is gone', () => {
    const plan = buildSupplierPlan([paid], [])
    expect(plan.lines[0]?.customers[0]?.name).toBe('Sin nombre')
  })
})

describe('buyersLabel', () => {
  it('spells out one or two names and counts the rest', () => {
    const line = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        customerId: `u${index}`,
        name: `Cliente ${index}`,
        quantity: 1,
        unpaid: false,
      }))

    expect(buyersLabel(line(1))).toBe('Cliente 0')
    expect(buyersLabel(line(2))).toBe('Cliente 0 y Cliente 1')
    expect(buyersLabel(line(4))).toBe('Cliente 0, Cliente 1 y 2 más')
  })
})

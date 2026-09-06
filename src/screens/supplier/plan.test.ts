import { describe, expect, it } from 'vitest'
import { makeCustomer, makeItem, makeOrder } from '../../domain/test-factories'
import { buildSupplierPlan, buyersLabel } from './plan'

const maria = makeCustomer({ id: 'u1', name: 'María' })
const ana = makeCustomer({ id: 'u2', name: 'Ana' })
const people = [maria, ana]

const confirmed = makeOrder({
  id: 'o1',
  customerId: 'u1',
  confirmed: true,
  items: [makeItem({ name: '38588 Novage', quantity: 3 })],
})

const unconfirmed = makeOrder({
  id: 'o2',
  customerId: 'u2',
  confirmed: false,
  items: [makeItem({ name: '38588 novage', quantity: 2 }), makeItem({ name: '42102 Labial', quantity: 1 })],
})

describe('buildSupplierPlan', () => {
  it('merges the same product across orders no matter how it was typed', () => {
    const plan = buildSupplierPlan([confirmed, unconfirmed], people, true)
    expect(plan.lines.map((line) => [line.name, line.quantity])).toEqual([
      ['38588 Novage', 5],
      ['42102 Labial', 1],
    ])
    expect(plan.consolidation.totalUnits).toBe(6)
    expect(plan.consolidation.customerCount).toBe(2)
  })

  it('names who is behind each line, biggest buyer first', () => {
    const plan = buildSupplierPlan([confirmed, unconfirmed], people, true)
    expect(plan.lines[0]?.customers).toEqual([
      { customerId: 'u1', name: 'María', quantity: 3, confirmed: true },
      { customerId: 'u2', name: 'Ana', quantity: 2, confirmed: false },
    ])
  })

  it('drops the unconfirmed orders when she asks for it', () => {
    const plan = buildSupplierPlan([confirmed, unconfirmed], people, false)
    expect(plan.lines).toHaveLength(1)
    expect(plan.consolidation.totalUnits).toBe(3)
  })

  it('keeps counting the unconfirmed units even when they are excluded', () => {
    for (const included of [true, false]) {
      const plan = buildSupplierPlan([confirmed, unconfirmed], people, included)
      expect(plan.unconfirmedUnits).toBe(3)
      expect(plan.unconfirmedOrders).toBe(1)
    }
  })

  it('survives an order whose customer is gone', () => {
    const plan = buildSupplierPlan([confirmed], [], true)
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
        confirmed: true,
      }))

    expect(buyersLabel(line(1))).toBe('Cliente 0')
    expect(buyersLabel(line(2))).toBe('Cliente 0 y Cliente 1')
    expect(buyersLabel(line(4))).toBe('Cliente 0, Cliente 1 y 2 más')
  })
})

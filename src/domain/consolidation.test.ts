import { describe, expect, it } from 'vitest'
import { consolidateForSupplier, formatForClipboard } from './consolidation'
import { makeItem, makeOrder } from './test-factories'

describe('consolidateForSupplier', () => {
  it('returns an empty consolidation when the campaign has no orders', () => {
    expect(consolidateForSupplier([])).toEqual({ items: [], totalUnits: 0, customerCount: 0 })
  })

  it('sums the same product across every order of the campaign', () => {
    const orders = [
      makeOrder({
        id: 'a',
        customerId: 'cus-1',
        items: [makeItem({ name: '38588 Novage', quantity: 2 }), makeItem({ name: '42102 Labial', quantity: 1 })],
      }),
      makeOrder({
        id: 'b',
        customerId: 'cus-2',
        items: [makeItem({ name: '38588 Novage', quantity: 3 })],
      }),
    ]
    const result = consolidateForSupplier(orders)
    expect(result.items).toEqual([
      { name: '38588 Novage', quantity: 5 },
      { name: '42102 Labial', quantity: 1 },
    ])
    expect(result.totalUnits).toBe(6)
    expect(result.customerCount).toBe(2)
  })

  it('treats names that differ only in case or padding as the same product', () => {
    const orders = [
      makeOrder({ id: 'a', customerId: 'cus-1', items: [makeItem({ name: '38588 Novage', quantity: 1 })] }),
      makeOrder({ id: 'b', customerId: 'cus-2', items: [makeItem({ name: '  38588 novage  ', quantity: 2 })] }),
    ]
    const result = consolidateForSupplier(orders)
    expect(result.items).toEqual([{ name: '38588 Novage', quantity: 3 }])
    expect(result.totalUnits).toBe(3)
  })

  it('counts a customer once even with several orders', () => {
    const orders = [
      makeOrder({ id: 'a', customerId: 'cus-1', items: [makeItem({ quantity: 1 })] }),
      makeOrder({ id: 'b', customerId: 'cus-1', items: [makeItem({ quantity: 1 })] }),
    ]
    expect(consolidateForSupplier(orders).customerCount).toBe(1)
  })

  it('sorts the products by name', () => {
    const orders = [
      makeOrder({
        id: 'a',
        customerId: 'cus-1',
        items: [
          makeItem({ name: 'Crema Milk & Honey', quantity: 1 }),
          makeItem({ name: 'Agua micelar', quantity: 1 }),
          makeItem({ name: 'Base The One', quantity: 1 }),
        ],
      }),
    ]
    expect(consolidateForSupplier(orders).items.map((item) => item.name)).toEqual([
      'Agua micelar',
      'Base The One',
      'Crema Milk & Honey',
    ])
  })
})

describe('formatForClipboard', () => {
  it('renders the block that goes into the Oriflame order', () => {
    const orders = [
      makeOrder({
        id: 'a',
        customerId: 'cus-1',
        items: [
          makeItem({ name: '38588 Novage Ecollagen', quantity: 5 }),
          makeItem({ name: '42102 Labial The One', quantity: 3 }),
        ],
      }),
      makeOrder({ id: 'b', customerId: 'cus-2', items: [makeItem({ name: '31234 Crema Milk & Honey', quantity: 2 })] }),
    ]
    const text = formatForClipboard(consolidateForSupplier(orders), 'C13')
    expect(text).toBe(
      [
        'PEDIDO CAMPAÑA C13 — 2 clientes',
        ' 2x  31234 Crema Milk & Honey',
        ' 5x  38588 Novage Ecollagen',
        ' 3x  42102 Labial The One',
        ' Total: 10 unidades',
      ].join('\n'),
    )
  })

  it('uses the singular for a single customer and a single unit', () => {
    const orders = [makeOrder({ id: 'a', customerId: 'cus-1', items: [makeItem({ name: 'Labial', quantity: 1 })] })]
    const text = formatForClipboard(consolidateForSupplier(orders), 'C13')
    expect(text).toBe(['PEDIDO CAMPAÑA C13 — 1 cliente', ' 1x  Labial', ' Total: 1 unidad'].join('\n'))
  })

  it('still renders a header for an empty campaign', () => {
    const text = formatForClipboard(consolidateForSupplier([]), 'C14')
    expect(text).toBe(['PEDIDO CAMPAÑA C14 — 0 clientes', ' Total: 0 unidades'].join('\n'))
  })
})

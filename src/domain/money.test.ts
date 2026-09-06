import { describe, expect, it } from 'vitest'
import { isPaid, orderBalance, orderSubtotal, orderTotal } from './money'
import { makeItem, makeOrder } from './test-factories'

describe('orderSubtotal', () => {
  it('is zero for an order with no items', () => {
    expect(orderSubtotal(makeOrder())).toBe(0)
  })

  it('sums quantity times price across items', () => {
    const order = makeOrder({
      items: [makeItem({ price: 10, quantity: 2 }), makeItem({ name: 'Labial', price: 5.5, quantity: 3 })],
    })
    expect(orderSubtotal(order)).toBe(36.5)
  })
})

describe('orderTotal', () => {
  it('adds the shipping cost to the subtotal', () => {
    const order = makeOrder({ items: [makeItem({ price: 20, quantity: 1 })], shippingCost: 4.25 })
    expect(orderTotal(order)).toBe(24.25)
  })

  it('equals the subtotal when the delivery is by hand in Ambato', () => {
    const order = makeOrder({ items: [makeItem({ price: 20, quantity: 1 })], shippingCost: 0 })
    expect(orderTotal(order)).toBe(20)
  })
})

describe('orderBalance', () => {
  it('subtracts what the customer already paid', () => {
    const order = makeOrder({ items: [makeItem({ price: 30, quantity: 1 })], paidAmount: 12 })
    expect(orderBalance(order)).toBe(18)
  })

  it('goes negative when the customer overpaid', () => {
    const order = makeOrder({ items: [makeItem({ price: 10, quantity: 1 })], paidAmount: 12 })
    expect(orderBalance(order)).toBe(-2)
  })
})

describe('isPaid', () => {
  it('is false while something is still owed', () => {
    expect(isPaid(makeOrder({ items: [makeItem({ price: 10, quantity: 1 })], paidAmount: 9.99 }))).toBe(false)
  })

  it('is true when the balance is exactly zero', () => {
    expect(isPaid(makeOrder({ items: [makeItem({ price: 10, quantity: 1 })], paidAmount: 10 }))).toBe(true)
  })

  it('is true when the customer overpaid', () => {
    expect(isPaid(makeOrder({ items: [makeItem({ price: 10, quantity: 1 })], paidAmount: 11 }))).toBe(true)
  })
})

describe('float drift', () => {
  it('adds cents that binary floats cannot represent', () => {
    const order = makeOrder({
      items: [makeItem({ name: 'a', price: 0.1, quantity: 1 }), makeItem({ name: 'b', price: 0.2, quantity: 1 })],
    })
    expect(orderSubtotal(order)).toBe(0.3)
  })

  it('multiplies a price by a quantity without drift', () => {
    const order = makeOrder({ items: [makeItem({ price: 12.9, quantity: 3 })] })
    expect(orderSubtotal(order)).toBe(38.7)
  })

  it('leaves no residue when the customer pays a drifting total in full', () => {
    const order = makeOrder({
      items: [makeItem({ name: 'a', price: 0.1, quantity: 1 }), makeItem({ name: 'b', price: 0.2, quantity: 1 })],
      paidAmount: 0.3,
    })
    expect(orderBalance(order)).toBe(0)
    expect(isPaid(order)).toBe(true)
  })

  it('keeps a long list of cheap items exact', () => {
    const order = makeOrder({
      items: Array.from({ length: 10 }, (_, index) => makeItem({ name: `item-${index}`, price: 0.1, quantity: 1 })),
      shippingCost: 2.9,
      paidAmount: 3.9,
    })
    expect(orderSubtotal(order)).toBe(1)
    expect(orderTotal(order)).toBe(3.9)
    expect(orderBalance(order)).toBe(0)
  })
})

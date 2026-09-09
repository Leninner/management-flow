import { describe, expect, it } from 'vitest'
import {
  campaignProfitCents,
  campaignSoldCents,
  collectedCents,
  nextCardCutoff,
  toRecoverCents,
} from './finances'
import { makeCampaign, makeItem, makeOrder } from './test-factories'

describe('campaignSoldCents', () => {
  it('adds up the items of every order and leaves shipping out', () => {
    const campaign = makeCampaign()
    const orders = [
      makeOrder({
        id: 'a',
        shippingCost: 5,
        items: [makeItem({ price: 100, quantity: 1 })],
      }),
    ]

    expect(campaignSoldCents(orders, campaign.id)).toBe(10_000)
  })

  it('counts an order she has not spoken to anybody about yet', () => {
    // There is no confirmation any more: writing it down is the commitment, and
    // a total that quietly left those out read as less than she had sold.
    const orders = [makeOrder({ id: 'a', items: [makeItem({ price: 50, quantity: 1 })] })]

    expect(campaignSoldCents(orders, 'camp-13')).toBe(5_000)
  })

  it('leaves out a line whose price nobody has written down', () => {
    const orders = [
      makeOrder({
        id: 'a',
        items: [makeItem({ code: '38588', price: 50 }), makeItem({ code: '42102', price: undefined })],
      }),
    ]

    expect(campaignSoldCents(orders, 'camp-13')).toBe(5_000)
  })

  it('ignores orders from another campaign', () => {
    const orders = [
      makeOrder({
        id: 'a',
        campaignId: 'camp-12',
        items: [makeItem({ price: 50, quantity: 1 })],
      }),
    ]

    expect(campaignSoldCents(orders, 'camp-13')).toBe(0)
  })
})

describe('campaignProfitCents', () => {
  it('is what was sold minus the invoice, with shipping out of both sides', () => {
    const campaign = makeCampaign({ supplierInvoiceAmount: 70 })
    const orders = [
      makeOrder({
        id: 'a',
        shippingCost: 5,
        items: [makeItem({ price: 100, quantity: 1 })],
      }),
    ]

    expect(campaignProfitCents(orders, campaign)).toBe(3_000)
  })

  it('is undefined while the invoice has not arrived', () => {
    const campaign = makeCampaign()
    const orders = [
      makeOrder({ id: 'a', items: [makeItem({ price: 100, quantity: 1 })] }),
    ]

    expect(campaignProfitCents(orders, campaign)).toBeUndefined()
  })

  it('adds in whole cents', () => {
    const campaign = makeCampaign({ supplierInvoiceAmount: 0.3 })
    const orders = [
      makeOrder({
        id: 'a',
        items: [makeItem({ price: 0.1, quantity: 1 }), makeItem({ price: 0.2, quantity: 1 })],
      }),
    ]

    expect(campaignProfitCents(orders, campaign)).toBe(0)
  })
})

describe('collectedCents', () => {
  it('counts everything paid in, shipping money included', () => {
    const orders = [
      makeOrder({ id: 'a', paidAmount: 10 }),
      makeOrder({ id: 'b', paidAmount: 5.5 }),
    ]

    expect(collectedCents(orders)).toBe(1_550)
  })
})

describe('toRecoverCents', () => {
  it('is the invoice minus what came back', () => {
    const campaigns = [makeCampaign({ id: 'c13', supplierInvoiceAmount: 180 })]
    const orders = [makeOrder({ id: 'a', campaignId: 'c13', paidAmount: 60 })]

    expect(toRecoverCents(orders, campaigns)).toBe(12_000)
  })

  it('does not let an over-collected campaign cover the hole of another', () => {
    const campaigns = [
      makeCampaign({ id: 'c12', supplierInvoiceAmount: 50 }),
      makeCampaign({ id: 'c13', supplierInvoiceAmount: 100 }),
    ]
    const orders = [makeOrder({ id: 'a', campaignId: 'c12', paidAmount: 80 })]

    expect(toRecoverCents(orders, campaigns)).toBe(10_000)
  })

  it('skips a campaign with no invoice written down', () => {
    const campaigns = [makeCampaign({ id: 'c13' })]
    const orders = [makeOrder({ id: 'a', campaignId: 'c13', paidAmount: 0 })]

    expect(toRecoverCents(orders, campaigns)).toBe(0)
  })
})

describe('nextCardCutoff', () => {
  it('lands this month when the day has not passed', () => {
    expect(nextCardCutoff('2026-09-08', 15)).toBe('2026-09-15')
  })

  it('lands next month when the day already passed', () => {
    expect(nextCardCutoff('2026-09-20', 15)).toBe('2026-10-15')
  })

  it('is today when today is the cutoff', () => {
    expect(nextCardCutoff('2026-09-15', 15)).toBe('2026-09-15')
  })

  it('clamps to the last day of a short month', () => {
    expect(nextCardCutoff('2026-11-30', 31)).toBe('2026-11-30')
    expect(nextCardCutoff('2026-04-30', 31)).toBe('2026-04-30')
    expect(nextCardCutoff('2026-02-01', 31)).toBe('2026-02-28')
  })

  it('rolls over the year', () => {
    expect(nextCardCutoff('2026-12-20', 15)).toBe('2027-01-15')
  })

  it('has no answer without a configured day', () => {
    expect(nextCardCutoff('2026-09-08', undefined)).toBeUndefined()
    expect(nextCardCutoff('2026-09-08', 0)).toBeUndefined()
    expect(nextCardCutoff('2026-09-08', 32)).toBeUndefined()
  })
})

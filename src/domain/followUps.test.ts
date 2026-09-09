import { describe, expect, it } from 'vitest'
import { followUps } from './followUps'
import { makeCampaign, makeCustomer, makeItem, makeOrder } from './test-factories'

const TODAY = '2026-09-05'

/** Cutoff far away, so the cutoff rule never interferes with the rule under test. */
const activeCampaign = makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-20', active: true })

function run(orders: Parameters<typeof followUps>[0]['orders'], overrides: Partial<Parameters<typeof followUps>[0]> = {}) {
  return followUps({
    orders,
    customers: [makeCustomer()],
    campaigns: [activeCampaign],
    today: TODAY,
    ...overrides,
  })
}

describe('confirmation', () => {
  it('fires one day after an unconfirmed order was captured in the live', () => {
    const order = makeOrder({ createdAt: '2026-09-04', items: [makeItem({ price: 20 })] })
    expect(run([order])).toEqual([
      expect.objectContaining({ orderId: 'ord-1', customerId: 'cus-1', templateKey: 'confirmation', daysWaiting: 1 }),
    ])
  })

  it('stays quiet on the same day the order was captured', () => {
    const order = makeOrder({ createdAt: TODAY, items: [makeItem({ price: 20 })] })
    expect(run([order])).toEqual([])
  })

  it('counts the days from the last contact, not from the order date', () => {
    const order = makeOrder({
      createdAt: '2026-08-20',
      contacts: [TODAY],
      items: [makeItem({ price: 20 })],
    })
    expect(run([order])).toEqual([])
  })
})

describe('payment', () => {
  it('fires two days after an order with nothing paid', () => {
    const order = makeOrder({ createdAt: '2026-09-03', items: [makeItem({ price: 20 })] })
    expect(run([order])).toEqual([expect.objectContaining({ templateKey: 'payment', daysWaiting: 2 })])
  })

  it('waits until the second day', () => {
    // Already written to once, so the first-notice rule is out of the way.
    const order = makeOrder({
      createdAt: '2026-09-04',
      items: [makeItem({ price: 20 })],
      contacts: ['2026-09-04'],
    })
    expect(run([order])).toEqual([])
  })

  it('stays quiet once the order is fully paid', () => {
    const order = makeOrder({ createdAt: '2026-09-01', items: [makeItem({ price: 20 })], paidAmount: 20 })
    expect(run([order])).toEqual([])
  })
})

describe('cutoff', () => {
  const closing = makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-08', active: true })

  it('fires the day the order is captured when the cutoff is three days away', () => {
    const order = makeOrder({ createdAt: TODAY, items: [makeItem({ price: 20 })] })
    const result = run([order], { campaigns: [closing] })
    expect(result).toEqual([expect.objectContaining({ templateKey: 'cutoff', daysWaiting: 0 })])
  })

  it('does not fire while the cutoff is more than three days away', () => {
    const order = makeOrder({ createdAt: TODAY, items: [makeItem({ price: 20 })] })
    const campaigns = [makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-09', active: true })]
    expect(run([order], { campaigns })).toEqual([])
  })

  it('does not fire once the cutoff has passed', () => {
    const order = makeOrder({ createdAt: TODAY, items: [makeItem({ price: 20 })] })
    const campaigns = [makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-04', active: true })]
    expect(run([order], { campaigns })).toEqual([])
  })

  it('does not fire for an order that is already paid', () => {
    const order = makeOrder({ createdAt: TODAY, items: [makeItem({ price: 20 })], paidAmount: 20 })
    expect(run([order], { campaigns: [closing] })).toEqual([])
  })
})

describe('balance', () => {
  it('fires three days after a partial payment', () => {
    const order = makeOrder({
      createdAt: '2026-09-02',
      items: [makeItem({ price: 20 })],
      paidAmount: 10,
    })
    expect(run([order])).toEqual([expect.objectContaining({ templateKey: 'balance', daysWaiting: 3 })])
  })

  it('waits until the third day', () => {
    const order = makeOrder({
      createdAt: '2026-09-03',
      items: [makeItem({ price: 20 })],
      paidAmount: 10,
      contacts: ['2026-09-03'],
    })
    expect(run([order])).toEqual([])
  })
})

describe('arrived', () => {
  const arrived = makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-20', arrivedAt: '2026-09-02', active: true })

  it('fires two days after the merchandise arrived and the order is still undelivered', () => {
    const order = makeOrder({
      createdAt: '2026-08-25',
      contacts: ['2026-09-03'],
      items: [makeItem({ price: 20 })],
      paidAmount: 20,
    })
    expect(run([order], { campaigns: [arrived] })).toEqual([
      expect.objectContaining({ templateKey: 'arrived', daysWaiting: 2 }),
    ])
  })

  it('stays quiet once the order was delivered', () => {
    const order = makeOrder({
      createdAt: '2026-08-25',
      contacts: ['2026-09-03'],
      items: [makeItem({ price: 20 })],
      paidAmount: 20,
      deliveredAt: '2026-09-04',
    })
    expect(run([order], { campaigns: [arrived] })).toEqual([])
  })

  it('stays quiet while the merchandise has not arrived', () => {
    const order = makeOrder({
      createdAt: '2026-08-25',
      contacts: ['2026-09-03'],
      items: [makeItem({ price: 20 })],
      paidAmount: 20,
    })
    expect(run([order])).toEqual([])
  })
})

describe('repurchase', () => {
  const settled = {
    createdAt: '2026-07-20',
    items: [makeItem({ price: 20 })],
    paidAmount: 20,
  }

  it('fires three weeks after the delivery', () => {
    const order = makeOrder({ ...settled, deliveredAt: '2026-08-15' })
    expect(run([order])).toEqual([expect.objectContaining({ templateKey: 'repurchase', daysWaiting: 21 })])
  })

  it('does not fire before three weeks', () => {
    const order = makeOrder({ ...settled, deliveredAt: '2026-08-16' })
    expect(run([order])).toEqual([])
  })

  it('fires only once, so a contact after the delivery silences it', () => {
    const order = makeOrder({ ...settled, deliveredAt: '2026-08-15', contacts: ['2026-09-01'] })
    expect(run([order])).toEqual([])
  })
})

describe('reengage', () => {
  const campaigns = [
    makeCampaign({ id: 'camp-11', cutoffDate: '2026-07-20', active: false }),
    makeCampaign({ id: 'camp-12', cutoffDate: '2026-08-20', active: false }),
    makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-07', active: true }),
  ]
  const frequent = makeCustomer({ id: 'frequent', name: 'Rosa' })
  const occasional = makeCustomer({ id: 'occasional', name: 'Lucía' })

  const paid = { items: [makeItem({ price: 10 })], paidAmount: 10, createdAt: '2026-07-01' }

  function reengageKeys(orders: ReturnType<typeof makeOrder>[], customers = [frequent, occasional]) {
    return followUps({ orders, customers, campaigns, today: TODAY })
      .filter((followUp) => followUp.templateKey === 'reengage')
      .map((followUp) => followUp.customerId)
  }

  it('fires for a customer who bought in two of the last three campaigns and is missing now', () => {
    const orders = [
      makeOrder({ ...paid, id: 'a', customerId: 'frequent', campaignId: 'camp-11' }),
      makeOrder({ ...paid, id: 'b', customerId: 'frequent', campaignId: 'camp-12' }),
      makeOrder({ ...paid, id: 'c', customerId: 'occasional', campaignId: 'camp-12' }),
    ]
    expect(reengageKeys(orders)).toEqual(['frequent'])
  })

  it('does not fire for a customer who already ordered in the active campaign', () => {
    const orders = [
      makeOrder({ ...paid, id: 'a', customerId: 'frequent', campaignId: 'camp-11' }),
      makeOrder({ ...paid, id: 'b', customerId: 'frequent', campaignId: 'camp-12' }),
      makeOrder({ ...paid, id: 'c', customerId: 'frequent', campaignId: 'camp-13' }),
    ]
    expect(reengageKeys(orders)).toEqual([])
  })

  it('does not fire while the cutoff is more than three days away', () => {
    const orders = [
      makeOrder({ ...paid, id: 'a', customerId: 'frequent', campaignId: 'camp-11' }),
      makeOrder({ ...paid, id: 'b', customerId: 'frequent', campaignId: 'camp-12' }),
    ]
    const far = campaigns.map((campaign) =>
      campaign.id === 'camp-13' ? { ...campaign, cutoffDate: '2026-09-30' } : campaign,
    )
    const result = followUps({ orders, customers: [frequent], campaigns: far, today: TODAY })
    expect(result.filter((followUp) => followUp.templateKey === 'reengage')).toEqual([])
  })

  it('carries no order id, because there is no order to attach it to', () => {
    const orders = [
      makeOrder({ ...paid, id: 'a', customerId: 'frequent', campaignId: 'camp-11' }),
      makeOrder({ ...paid, id: 'b', customerId: 'frequent', campaignId: 'camp-12' }),
    ]
    const result = followUps({ orders, customers: [frequent], campaigns, today: TODAY })
    const reengage = result.find((followUp) => followUp.templateKey === 'reengage')
    expect(reengage?.orderId).toBeUndefined()
  })
})

describe('the two follow-up cap', () => {
  it('drops an order that was already chased twice', () => {
    const order = makeOrder({
      createdAt: '2026-08-01',
      contacts: ['2026-08-02', '2026-08-03'],
      items: [makeItem({ price: 20 })],
    })
    expect(run([order])).toEqual([])
  })

  it('still chases an order contacted once', () => {
    const order = makeOrder({
      createdAt: '2026-08-01',
      contacts: ['2026-09-03'],
      items: [makeItem({ price: 20 })],
    })
    expect(run([order])).toHaveLength(1)
  })
})

describe('ordering', () => {
  it('never returns two follow-ups for the same order', () => {
    const campaigns = [makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-06', arrivedAt: '2026-09-01', active: true })]
    const order = makeOrder({ createdAt: '2026-08-01', items: [makeItem({ price: 20 })] })
    expect(run([order], { campaigns })).toHaveLength(1)
  })

  it('puts the cutoff before everything else', () => {
    const campaigns = [makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-06', arrivedAt: '2026-09-01', active: true })]
    const unconfirmed = makeOrder({
      id: 'unconfirmed',
      customerId: 'cus-2',
      createdAt: '2026-08-01',
      items: [makeItem({ price: 20 })],
      paidAmount: 20,
    })
    const owing = makeOrder({
      id: 'owing',
      customerId: 'cus-1',
      createdAt: '2026-09-04',
      items: [makeItem({ price: 20 })],
    })
    const result = run([unconfirmed, owing], { campaigns })
    expect(result.map((followUp) => followUp.templateKey)).toEqual(['cutoff', 'arrived'])
  })

  it('puts the longest wait first inside the same template', () => {
    const older = makeOrder({ id: 'older', createdAt: '2026-08-30', items: [makeItem({ price: 5 })] })
    const newer = makeOrder({ id: 'newer', createdAt: '2026-09-03', items: [makeItem({ price: 5 })] })
    const result = run([newer, older])
    expect(result.map((followUp) => followUp.orderId)).toEqual(['older', 'newer'])
  })
})

describe('reengage silencing', () => {
  const campaigns = [
    makeCampaign({ id: 'camp-11', cutoffDate: '2026-07-20', active: false }),
    makeCampaign({ id: 'camp-12', cutoffDate: '2026-08-20', active: false }),
    makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-07', active: true }),
  ]
  const paid = { items: [makeItem({ price: 10 })], paidAmount: 10, createdAt: '2026-07-01' }
  const orders = [
    makeOrder({ ...paid, id: 'a', customerId: 'frequent', campaignId: 'camp-11' }),
    makeOrder({ ...paid, id: 'b', customerId: 'frequent', campaignId: 'camp-12' }),
  ]

  function reengageFor(contacts: string[]) {
    const customer = makeCustomer({ id: 'frequent', name: 'Rosa', contacts })
    return followUps({ orders, customers: [customer], campaigns, today: TODAY }).find(
      (followUp) => followUp.templateKey === 'reengage',
    )
  }

  it('fires when she has not written to the customer in this run-up', () => {
    expect(reengageFor([])).toMatchObject({ customerId: 'frequent' })
  })

  it('goes quiet once she wrote during the run-up to this cutoff', () => {
    expect(reengageFor(['2026-09-04'])).toBeUndefined()
  })

  it('fires again in a new campaign, because the old contact is outside this run-up', () => {
    expect(reengageFor(['2026-08-15'])).toMatchObject({ daysWaiting: 21 })
  })

  it('counts the days from the last message sent to the person', () => {
    expect(reengageFor(['2026-08-31'])).toMatchObject({ daysWaiting: 5 })
  })

  it('stops after two messages inside the same campaign, like an order does', () => {
    expect(reengageFor(['2026-08-25', '2026-08-27'])).toBeUndefined()
  })

  it('starts over in a new campaign, however many messages the old ones took', () => {
    expect(reengageFor(['2026-01-01', '2026-08-15'])).toMatchObject({ daysWaiting: 21 })
  })

  it('survives a customer stored before the contact log existed', () => {
    const legacy = { id: 'frequent', name: 'Rosa', aliases: [] } as unknown as ReturnType<typeof makeCustomer>
    const result = followUps({ orders, customers: [legacy], campaigns, today: TODAY })
    expect(result.find((followUp) => followUp.templateKey === 'reengage')).toMatchObject({ customerId: 'frequent' })
  })
})

describe('a cutoff date that moves', () => {
  const campaigns = [
    makeCampaign({ id: 'camp-11', cutoffDate: '2026-07-20', active: false }),
    makeCampaign({ id: 'camp-12', cutoffDate: '2026-08-20', active: false }),
  ]
  const paid = { items: [makeItem({ price: 10 })], paidAmount: 10, createdAt: '2026-07-01' }
  const orders = [
    makeOrder({ ...paid, id: 'a', customerId: 'frequent', campaignId: 'camp-11' }),
    makeOrder({ ...paid, id: 'b', customerId: 'frequent', campaignId: 'camp-12' }),
  ]
  const customer = makeCustomer({ id: 'frequent', name: 'Rosa' })

  it('goes quiet instead of throwing when the cutoff lands before the previous campaign closed', () => {
    const active = makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-06', active: true })
    const dragged = { ...active, cutoffDate: '2026-08-10' }
    const result = followUps({ orders, customers: [customer], campaigns: [...campaigns, dragged], today: TODAY })
    expect(result.filter((followUp) => followUp.templateKey === 'reengage')).toEqual([])
  })

  it('goes quiet when the cutoff is dragged into the past', () => {
    const dragged = makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-01', active: true })
    const result = followUps({ orders, customers: [customer], campaigns: [...campaigns, dragged], today: TODAY })
    expect(result.filter((followUp) => followUp.templateKey === 'reengage')).toEqual([])
  })

  it('still fires when the cutoff is only pulled a little closer', () => {
    const dragged = makeCampaign({ id: 'camp-13', cutoffDate: '2026-09-05', active: true })
    const result = followUps({ orders, customers: [customer], campaigns: [...campaigns, dragged], today: TODAY })
    expect(result.filter((followUp) => followUp.templateKey === 'reengage')).toHaveLength(1)
  })
})

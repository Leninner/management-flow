import { beforeEach, describe, expect, it } from 'vitest'
import * as campaignProducts from './campaignProducts'
import * as orders from './orders'
import { resetDatabase } from './test-db'

const C13 = 'camp-13'
const C14 = 'camp-14'

beforeEach(resetDatabase)

describe('remember', () => {
  it('records a product the first time it is sold in a campaign', async () => {
    await campaignProducts.remember({ campaignId: C13, code: '38588', name: 'Novage', price: 12.9 })
    await expect(campaignProducts.find(C13, '38588')).resolves.toMatchObject({
      code: '38588',
      name: 'Novage',
      price: 12.9,
    })
  })

  it('never overwrites a price she already put in', async () => {
    await campaignProducts.remember({ campaignId: C13, code: '38588', name: 'Novage', price: 12.9 })
    await campaignProducts.remember({ campaignId: C13, code: '38588', name: 'Novage', price: 40 })
    await expect(campaignProducts.find(C13, '38588')).resolves.toMatchObject({ price: 12.9 })
  })

  it('replaces a placeholder name that was only the code repeated back', async () => {
    await campaignProducts.setPrice(C13, '38588', 12.9)
    await expect(campaignProducts.find(C13, '38588')).resolves.toMatchObject({ name: '38588' })
    await campaignProducts.remember({ campaignId: C13, code: '38588', name: 'Novage' })
    await expect(campaignProducts.find(C13, '38588')).resolves.toMatchObject({ name: 'Novage' })
  })
})

describe('prices between campaigns', () => {
  it('keeps the same product at a different price in each campaign', async () => {
    await campaignProducts.remember({ campaignId: C13, code: '38588', name: 'Novage', price: 12.9 })
    await campaignProducts.remember({ campaignId: C14, code: '38588', name: 'Novage', price: 15.5 })

    await expect(campaignProducts.find(C13, '38588')).resolves.toMatchObject({ price: 12.9 })
    await expect(campaignProducts.find(C14, '38588')).resolves.toMatchObject({ price: 15.5 })
  })

})

describe('setPrice', () => {
  it('clears the price rather than storing a zero', async () => {
    await campaignProducts.setPrice(C13, '38588', 12.9)
    await campaignProducts.setPrice(C13, '38588', undefined)
    const product = await campaignProducts.find(C13, '38588')
    expect(product?.price).toBeUndefined()
  })
})

describe('what a live writes down', () => {
  it('builds the campaign catalogue out of the orders themselves', async () => {
    await orders.addItem({
      campaignId: C13,
      customerId: 'cus-1',
      item: { name: '38588 Novage Ecollagen', price: 12.9 },
    })
    await orders.addItem({ campaignId: C13, customerId: 'cus-2', item: { name: '42102 Labial' } })

    const catalogue = await campaignProducts.listByCampaign(C13)
    expect(catalogue.map((product) => product.code).sort()).toEqual(['38588', '42102'])
    // Written down mid-live with no price: absent, never zero.
    expect(catalogue.find((product) => product.code === '42102')?.price).toBeUndefined()
  })

  it('fills a missing price the first time she does write one down', async () => {
    await orders.addItem({ campaignId: C13, customerId: 'cus-1', item: { name: '38588 Novage' } })
    await orders.addItem({ campaignId: C13, customerId: 'cus-2', item: { name: '38588 Novage', price: 12.9 } })
    await expect(campaignProducts.find(C13, '38588')).resolves.toMatchObject({ price: 12.9 })
  })
})

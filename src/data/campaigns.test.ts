import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import * as campaigns from './campaigns'
import { resetDatabase } from './test-db'

beforeEach(resetDatabase)

describe('create', () => {
  it('stores the campaign and makes it the active one', async () => {
    const campaign = await campaigns.create({ name: 'C13-2026', cutoffDate: '2026-09-20' })
    expect(campaign.id).toBeTruthy()
    expect(campaign.active).toBe(true)
    await expect(db.campaigns.get(campaign.id)).resolves.toEqual(campaign)
  })

  it('leaves only one campaign active', async () => {
    const first = await campaigns.create({ name: 'C12-2026', cutoffDate: '2026-08-20' })
    const second = await campaigns.create({ name: 'C13-2026', cutoffDate: '2026-09-20' })
    await expect(db.campaigns.get(first.id)).resolves.toMatchObject({ active: false })
    await expect(campaigns.getActive()).resolves.toMatchObject({ id: second.id })
  })

  it('rejects a campaign without a name', async () => {
    await expect(campaigns.create({ name: '  ', cutoffDate: '2026-09-20' })).rejects.toThrow()
  })
})

describe('getActive', () => {
  it('returns nothing on a fresh install', async () => {
    await expect(campaigns.getActive()).resolves.toBeUndefined()
  })
})

describe('setActive', () => {
  it('moves the active flag and leaves a single active campaign', async () => {
    const first = await campaigns.create({ name: 'C12-2026', cutoffDate: '2026-08-20' })
    await campaigns.create({ name: 'C13-2026', cutoffDate: '2026-09-20' })

    await campaigns.setActive(first.id)

    await expect(campaigns.getActive()).resolves.toMatchObject({ id: first.id })
    const active = await db.campaigns.filter((campaign) => campaign.active).toArray()
    expect(active).toHaveLength(1)
  })

  it('throws for a campaign that does not exist', async () => {
    await expect(campaigns.setActive('nope')).rejects.toThrow()
  })
})

describe('markArrived', () => {
  it('stores the arrival date of the merchandise', async () => {
    const campaign = await campaigns.create({ name: 'C13-2026', cutoffDate: '2026-09-20' })
    await campaigns.markArrived(campaign.id, '2026-09-22T00:00:00.000Z')
    await expect(db.campaigns.get(campaign.id)).resolves.toMatchObject({ arrivedAt: '2026-09-22T00:00:00.000Z' })
  })

  it('defaults to now', async () => {
    const campaign = await campaigns.create({ name: 'C13-2026', cutoffDate: '2026-09-20' })
    const updated = await campaigns.markArrived(campaign.id)
    expect(updated.arrivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('close', () => {
  it('deactivates the campaign', async () => {
    const campaign = await campaigns.create({ name: 'C13-2026', cutoffDate: '2026-09-20' })
    await campaigns.close(campaign.id)
    await expect(campaigns.getActive()).resolves.toBeUndefined()
    await expect(db.campaigns.get(campaign.id)).resolves.toMatchObject({ active: false })
  })
})

describe('update', () => {
  it('fixes a typo in the name', async () => {
    const campaign = await campaigns.create({ name: 'C13-2062', cutoffDate: '2026-09-20' })
    const updated = await campaigns.update(campaign.id, { name: '  C13-2026  ' })
    expect(updated).toMatchObject({ name: 'C13-2026', cutoffDate: '2026-09-20', active: true })
  })

  it('moves the cutoff date', async () => {
    const campaign = await campaigns.create({ name: 'C13-2026', cutoffDate: '2026-09-20' })
    await campaigns.update(campaign.id, { cutoffDate: '2026-09-18' })
    await expect(db.campaigns.get(campaign.id)).resolves.toMatchObject({ cutoffDate: '2026-09-18' })
  })

  it('leaves the active flag and the arrival date alone', async () => {
    const campaign = await campaigns.create({ name: 'C13-2026', cutoffDate: '2026-09-20' })
    await campaigns.markArrived(campaign.id, '2026-09-22T00:00:00.000Z')
    const updated = await campaigns.update(campaign.id, { name: 'C13' })
    expect(updated).toMatchObject({ active: true, arrivedAt: '2026-09-22T00:00:00.000Z' })
  })

  it('refuses an empty name and a date that is not ISO', async () => {
    const campaign = await campaigns.create({ name: 'C13-2026', cutoffDate: '2026-09-20' })
    await expect(campaigns.update(campaign.id, { name: '   ' })).rejects.toThrow()
    await expect(campaigns.update(campaign.id, { cutoffDate: '20/09/2026' })).rejects.toThrow()
  })

  it('throws for a campaign that does not exist', async () => {
    await expect(campaigns.update('nope', { name: 'C13' })).rejects.toThrow()
  })
})

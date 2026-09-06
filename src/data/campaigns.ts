/**
 * Campaign repository. The campaign is the heartbeat of the business: every
 * order belongs to one, and only one campaign is open at a time.
 */
import { db, newId } from '../db/db'
import type { Campaign } from '../db/types'
import { nowIso } from '../domain/dates'

export interface NewCampaign {
  name: string
  /** ISO date of the last day to place the order with Oriflame. */
  cutoffDate: string
  active?: boolean
}

/**
 * IndexedDB cannot index a boolean, so the `active` flag is scanned instead of
 * queried. A consultant runs a dozen campaigns a year; the scan costs nothing.
 */
export async function getActive(): Promise<Campaign | undefined> {
  return db.campaigns.filter((campaign) => campaign.active).first()
}

export async function get(id: string): Promise<Campaign | undefined> {
  return db.campaigns.get(id)
}

/** Newest cutoff first, which is the order the screens read them in. */
export async function list(): Promise<Campaign[]> {
  return db.campaigns.orderBy('cutoffDate').reverse().toArray()
}

export async function create(input: NewCampaign): Promise<Campaign> {
  const name = input.name.trim()
  if (!name) throw new Error('A campaign needs a name')
  if (!input.cutoffDate) throw new Error('A campaign needs a cutoff date')

  const campaign: Campaign = { id: newId(), name, cutoffDate: input.cutoffDate, active: input.active ?? true }
  await db.transaction('rw', db.campaigns, async () => {
    if (campaign.active) await deactivateAll()
    await db.campaigns.add(campaign)
  })
  return campaign
}

export async function setActive(id: string): Promise<Campaign> {
  return db.transaction('rw', db.campaigns, async () => {
    const campaign = await db.campaigns.get(id)
    if (!campaign) throw new Error(`Unknown campaign: ${id}`)
    await deactivateAll()
    await db.campaigns.update(id, { active: true })
    return { ...campaign, active: true }
  })
}

/** The merchandise arrived from Oriflame; the delivery follow-ups start here. */
export async function markArrived(id: string, arrivedAt: string = nowIso()): Promise<Campaign> {
  return patch(id, { arrivedAt })
}

export async function close(id: string): Promise<Campaign> {
  return patch(id, { active: false })
}

async function deactivateAll(): Promise<void> {
  await db.campaigns.filter((campaign) => campaign.active).modify({ active: false })
}

async function patch(id: string, changes: Partial<Campaign>): Promise<Campaign> {
  return db.transaction('rw', db.campaigns, async () => {
    const campaign = await db.campaigns.get(id)
    if (!campaign) throw new Error(`Unknown campaign: ${id}`)
    const updated = { ...campaign, ...changes }
    await db.campaigns.put(updated)
    return updated
  })
}

/**
 * Campaign repository. The campaign is the heartbeat of the business: every
 * order belongs to one, and only one campaign is open at a time.
 */
import { db, newId } from '../db/db'
import type { Campaign } from '../db/types'
import { nowIso } from '../domain/dates'

/** Only the two fields an edit screen shows. Activation has its own verbs. */
export type CampaignPatch = Partial<Pick<Campaign, 'name' | 'cutoffDate'>>

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
  const name = cleanName(input.name)
  const cutoffDate = cleanCutoff(input.cutoffDate)

  const campaign: Campaign = { id: newId(), name, cutoffDate, active: input.active ?? true }
  await db.transaction('rw', db.campaigns, async () => {
    if (campaign.active) await deactivateAll()
    await db.campaigns.add(campaign)
  })
  return campaign
}

/**
 * Fixes a typo in the name or a wrong cutoff date. Opening a new campaign to
 * correct a letter would be absurd, and it would strand the orders.
 */
export async function update(id: string, changes: CampaignPatch): Promise<Campaign> {
  const patched: CampaignPatch = {
    ...(changes.name === undefined ? {} : { name: cleanName(changes.name) }),
    ...(changes.cutoffDate === undefined ? {} : { cutoffDate: cleanCutoff(changes.cutoffDate) }),
  }
  return patch(id, patched)
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

function cleanName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('A campaign needs a name')
  return trimmed
}

/**
 * Dates are ISO strings everywhere. A localised date would silently turn every
 * day count in the follow-up rules into NaN, which reads as "no follow-ups".
 */
function cleanCutoff(cutoffDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(cutoffDate)) throw new Error(`A cutoff date must be ISO: ${cutoffDate}`)
  return cutoffDate
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

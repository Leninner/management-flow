/**
 * The catalogue of one campaign.
 *
 * It builds itself out of what she sells, exactly like the old suggestion
 * history did, but scoped to a campaign so that a new catalogue cannot inherit
 * last month's prices without her noticing.
 */
import { db } from '../db/db'
import type { CampaignProduct } from '../db/types'
import { fromCents, toCents } from '../domain/money'

function idOf(campaignId: string, code: string): string {
  return `${campaignId}:${code}`
}

export async function listByCampaign(campaignId: string): Promise<CampaignProduct[]> {
  return db.campaignProducts.where('campaignId').equals(campaignId).toArray()
}

export async function listAll(): Promise<CampaignProduct[]> {
  return db.campaignProducts.toArray()
}

export async function find(campaignId: string, code: string): Promise<CampaignProduct | undefined> {
  return db.campaignProducts.get(idOf(campaignId, code))
}

/**
 * Records that this product exists in this campaign, without ever overwriting a
 * price or a cost she already put in. Called every time a line is written down,
 * so it has to be safe to call constantly.
 */
export async function remember(input: {
  campaignId: string
  code: string
  name: string
  price?: number
}): Promise<CampaignProduct> {
  const id = idOf(input.campaignId, input.code)
  return db.transaction('rw', db.campaignProducts, async () => {
    const existing = await db.campaignProducts.get(id)
    const product: CampaignProduct = {
      id,
      campaignId: input.campaignId,
      code: input.code,
      // A real name beats a placeholder that is just the code repeated back.
      name: existing && existing.name !== existing.code ? existing.name : input.name,
      ...(existing?.price !== undefined
        ? { price: existing.price }
        : input.price === undefined
          ? {}
          : { price: input.price }),
    }
    await db.campaignProducts.put(product)
    return product
  })
}

/** The catalogue price for this campaign. Absent is a real answer. */
export async function setPrice(campaignId: string, code: string, price: number | undefined): Promise<void> {
  await patch(campaignId, code, (product) =>
    price === undefined ? omit(product, 'price') : { ...product, price: fromCents(toCents(price)) },
  )
}

export async function removeByCampaign(campaignId: string): Promise<void> {
  await db.campaignProducts.where('campaignId').equals(campaignId).delete()
}

function omit(product: CampaignProduct, key: 'price'): CampaignProduct {
  const copy = { ...product }
  delete copy[key]
  return copy
}

async function patch(
  campaignId: string,
  code: string,
  change: (product: CampaignProduct) => CampaignProduct,
): Promise<CampaignProduct> {
  const id = idOf(campaignId, code)
  return db.transaction('rw', db.campaignProducts, async () => {
    const existing = (await db.campaignProducts.get(id)) ?? { id, campaignId, code, name: code }
    const updated = change(existing)
    await db.campaignProducts.put(updated)
    return updated
  })
}

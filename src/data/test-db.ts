/** Test-only helper: empties every table between cases. */
import { db } from '../db/db'

export async function resetDatabase(): Promise<void> {
  if (!db.isOpen()) await db.open()
  await db.transaction(
    'rw',
    db.campaigns,
    db.customers,
    db.orders,
    db.campaignProducts,
    db.settings,
    async () => {
      await db.campaigns.clear()
      await db.customers.clear()
      await db.orders.clear()
      await db.campaignProducts.clear()
      await db.settings.clear()
    },
  )
}

/**
 * Opening a new campaign has to decide what happens to the orders she wrote
 * down in a live and that never went anywhere: they follow the customer into
 * the new catalogue, or they go.
 *
 * "Never went anywhere" is nothing paid and nothing delivered. It used to be an
 * unticked confirmation flag, which meant the answer depended on paperwork she
 * had to keep up rather than on what had actually happened.
 *
 * Carrying them is `orders.moveOpenOrders`. Throwing them away has no verb of
 * its own because deleting an order is already one call; this only picks which
 * ones, and an order somebody has paid for is never among them.
 */
import { orders } from '../../data'

export async function discardOpenOrders(campaignId: string): Promise<number> {
  const all = await orders.listByCampaign(campaignId)
  const open = all.filter(orders.isOpen)
  for (const order of open) await orders.remove(order.id)
  return open.length
}

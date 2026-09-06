/**
 * Opening a new campaign has to decide what happens to the orders she captured
 * in a live and nobody ever confirmed: they follow the customer into the new
 * catalog, or they go.
 *
 * Carrying them is `orders.moveUnconfirmed`. Throwing them away has no verb of
 * its own because deleting an order is already one call; this only picks which
 * ones, and confirmed orders are never among them.
 */
import { orders } from '../../data'

export async function discardUnconfirmedOrders(campaignId: string): Promise<number> {
  const all = await orders.listByCampaign(campaignId)
  const pending = all.filter((order) => !order.confirmed)
  for (const order of pending) await orders.remove(order.id)
  return pending.length
}

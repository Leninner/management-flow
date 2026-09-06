/**
 * Follow-up triggers.
 *
 * The list of things to do today. Days are counted from the last "ya le
 * escribí", not from the order date: without that the app repeats the same ten
 * names every morning and she stops opening it within a week.
 */
import type { Campaign, Customer, Order } from '../db/types'
import { contactsOf } from './customers'
import { daysBetween } from './dates'
import { orderBalanceCents, orderTotalCents, toCents } from './money'

export type FollowUpTemplateKey =
  | 'confirmation'
  | 'payment'
  | 'cutoff'
  | 'balance'
  | 'arrived'
  | 'repurchase'
  | 'reengage'

export interface FollowUp {
  /** Absent for 'reengage': there is no order yet, that is the point. */
  orderId?: string
  customerId: string
  templateKey: FollowUpTemplateKey
  /** Short English explanation, for debugging and for tooltips in dev. */
  reason: string
  /** Days since the last contact, or since the event the rule measures. */
  daysWaiting: number
}

export interface FollowUpInput {
  orders: Order[]
  customers: Customer[]
  campaigns: Campaign[]
  /** ISO date. Always injected, never read from the clock, so tests are stable. */
  today: string
}

/** After two messages she stops, on an order or on a person. Insisting burns customers. */
export const MAX_FOLLOW_UPS_PER_ORDER = 2
/** A customer who bought in this many of the last three campaigns is frequent. */
export const FREQUENT_CAMPAIGNS = 2
const RECENT_CAMPAIGNS = 3
const CUTOFF_WARNING_DAYS = 3
const REPURCHASE_DAYS = 21

/** Most urgent first. A deadline beats money, money beats housekeeping. */
const PRIORITY: Record<FollowUpTemplateKey, number> = {
  cutoff: 0,
  arrived: 1,
  balance: 2,
  payment: 3,
  confirmation: 4,
  reengage: 5,
  repurchase: 6,
}

function lastTouch(order: Order): string {
  return order.contacts[order.contacts.length - 1] ?? order.createdAt
}

/** At most one follow-up per order: one row, one WhatsApp button, one template. */
function orderFollowUp(order: Order, campaign: Campaign | undefined, today: string): FollowUp | undefined {
  const daysWaiting = Math.max(0, daysBetween(lastTouch(order), today))
  const balance = orderBalanceCents(order)
  const paid = toCents(order.paidAmount)
  const total = orderTotalCents(order)
  const daysToCutoff = campaign ? daysBetween(today, campaign.cutoffDate) : undefined
  const base = { orderId: order.id, customerId: order.customerId }

  const candidates: FollowUp[] = []

  if (balance > 0 && daysToCutoff !== undefined && daysToCutoff >= 0 && daysToCutoff <= CUTOFF_WARNING_DAYS) {
    candidates.push({
      ...base,
      templateKey: 'cutoff',
      reason: `unpaid with ${daysToCutoff} day(s) left before the campaign cutoff`,
      daysWaiting,
    })
  }

  if (campaign?.arrivedAt && !order.deliveredAt && daysWaiting >= 2) {
    candidates.push({ ...base, templateKey: 'arrived', reason: 'merchandise arrived and is not delivered', daysWaiting })
  }

  if (paid > 0 && paid < total && daysWaiting >= 3) {
    candidates.push({ ...base, templateKey: 'balance', reason: 'partially paid', daysWaiting })
  }

  if (order.confirmed && paid <= 0 && balance > 0 && daysWaiting >= 2) {
    candidates.push({ ...base, templateKey: 'payment', reason: 'confirmed and nothing paid', daysWaiting })
  }

  if (!order.confirmed && daysWaiting >= 1) {
    candidates.push({ ...base, templateKey: 'confirmation', reason: 'captured in the live and not confirmed', daysWaiting })
  }

  if (order.deliveredAt) {
    const sinceDelivery = daysBetween(order.deliveredAt, today)
    const contactedAfterDelivery = lastTouch(order) > order.deliveredAt
    if (sinceDelivery >= REPURCHASE_DAYS && !contactedAfterDelivery) {
      candidates.push({
        ...base,
        templateKey: 'repurchase',
        reason: `delivered ${sinceDelivery} days ago`,
        daysWaiting: sinceDelivery,
      })
    }
  }

  return candidates.sort((a, b) => PRIORITY[a.templateKey] - PRIORITY[b.templateKey])[0]
}

function reengagements({ orders, customers, campaigns, today }: FollowUpInput): FollowUp[] {
  const active = campaigns.find((campaign) => campaign.active)
  if (!active) return []

  const daysToCutoff = daysBetween(today, active.cutoffDate)
  if (daysToCutoff < 0 || daysToCutoff > CUTOFF_WARNING_DAYS) return []

  const previous = campaigns
    .filter((campaign) => campaign.id !== active.id && campaign.cutoffDate <= active.cutoffDate)
    .sort((a, b) => b.cutoffDate.localeCompare(a.cutoffDate) || b.id.localeCompare(a.id))
  const recentIds = new Set(previous.slice(0, RECENT_CAMPAIGNS).map((campaign) => campaign.id))
  if (recentIds.size < FREQUENT_CAMPAIGNS) return []

  /** This campaign owns every contact made after the previous campaign closed. */
  const campaignStart = previous[0]?.cutoffDate ?? ''

  const ordersByCustomer = new Map<string, Order[]>()
  for (const order of orders) {
    const bucket = ordersByCustomer.get(order.customerId)
    if (bucket) bucket.push(order)
    else ordersByCustomer.set(order.customerId, [order])
  }

  const result: FollowUp[] = []
  for (const customer of customers) {
    const theirs = ordersByCustomer.get(customer.id) ?? []
    if (theirs.some((order) => order.campaignId === active.id)) continue

    const bought = new Set(theirs.filter((order) => recentIds.has(order.campaignId)).map((order) => order.campaignId))
    if (bought.size < FREQUENT_CAMPAIGNS) continue

    // A reengage has no order to record "ya le escribí" on, so it counts on the
    // customer's own contact log. Both guards look only at this campaign: with
    // seventeen catalogues a year, a cap that reached across them would silence
    // a good customer forever after her second message.
    const contacts = contactsOf(customer)
    const thisCampaign = contacts.filter((contact) => contact > campaignStart)
    if (thisCampaign.length >= MAX_FOLLOW_UPS_PER_ORDER) continue
    // One message per run-up, not one a day for three days.
    const lastHere = thisCampaign[thisCampaign.length - 1]
    if (lastHere !== undefined && daysBetween(lastHere, active.cutoffDate) <= CUTOFF_WARNING_DAYS) continue
    const lastContact = contacts[contacts.length - 1]

    const lastActivity = theirs.reduce((latest, order) => {
      const touch = lastTouch(order)
      return touch > latest ? touch : latest
    }, '')
    const since = lastContact ?? lastActivity
    result.push({
      customerId: customer.id,
      templateKey: 'reengage',
      reason: 'frequent customer with no order in the active campaign',
      daysWaiting: since ? Math.max(0, daysBetween(since, today)) : 0,
    })
  }
  return result
}

export function followUps(input: FollowUpInput): FollowUp[] {
  const { orders, campaigns, today } = input
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]))

  const result: FollowUp[] = []
  for (const order of orders) {
    if (order.contacts.length >= MAX_FOLLOW_UPS_PER_ORDER) continue
    const followUp = orderFollowUp(order, campaignById.get(order.campaignId), today)
    if (followUp) result.push(followUp)
  }
  result.push(...reengagements(input))

  return result.sort(
    (a, b) =>
      PRIORITY[a.templateKey] - PRIORITY[b.templateKey] ||
      b.daysWaiting - a.daysWaiting ||
      (a.orderId ?? '').localeCompare(b.orderId ?? '') ||
      a.customerId.localeCompare(b.customerId),
  )
}

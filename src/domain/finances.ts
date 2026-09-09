/**
 * The money that is hers.
 *
 * Two questions live here. What she earned on a campaign, and how much of what
 * she put in with her credit card has not come back yet. Both hang off a single
 * number she writes down once per campaign: what Oriflame invoiced her. It is
 * the same number the card charges her, so the two answers can never disagree.
 *
 * Everything is computed in integer cents and nothing is ever stored.
 */
import type { Campaign, Order } from '../db/types'
import { orderSubtotalCents, toCents } from './money'

/**
 * What was sold in a campaign, items only.
 *
 * Every order counts. There used to be a confirmation flag and this function
 * skipped anything without it, so the number she read as her earnings was
 * quietly short by whatever she had not gone back to tick.
 *
 * Shipping is deliberately out: it comes in from the customer and goes out to
 * the courier the same day. Counting it would tell her she earns more than she
 * earns, and she buys the next catalogue against that number.
 */
export function campaignSoldCents(orders: readonly Order[], campaignId: string): number {
  let cents = 0
  for (const order of orders) {
    if (order.campaignId !== campaignId) continue
    cents += orderSubtotalCents(order)
  }
  return cents
}

/**
 * Sold minus invoiced. Undefined until the invoice arrives: with no invoice
 * there is no profit to state, and inventing one with a fixed percentage
 * produces a number that never matches what the card actually charged.
 */
export function campaignProfitCents(
  orders: readonly Order[],
  campaign: Campaign,
): number | undefined {
  if (campaign.supplierInvoiceAmount === undefined) return undefined
  return campaignSoldCents(orders, campaign.id) - toCents(campaign.supplierInvoiceAmount)
}

/** Everything the customers actually handed over, shipping money included. */
export function collectedCents(orders: readonly Order[]): number {
  let cents = 0
  for (const order of orders) cents += toCents(order.paidAmount)
  return cents
}

/**
 * Money she fronted with the card that has not come back.
 *
 * Summed across every campaign that has an invoice, not only the open one: an
 * old catalogue that was never fully collected is still her money out there,
 * and the card does not care which catalogue it was. The floor is per campaign
 * so one over-collected campaign cannot paper over another one's hole.
 */
export function toRecoverCents(
  orders: readonly Order[],
  campaigns: readonly Campaign[],
): number {
  let cents = 0
  for (const campaign of campaigns) {
    if (campaign.supplierInvoiceAmount === undefined) continue
    const theirs = orders.filter((order) => order.campaignId === campaign.id)
    const outstanding = toCents(campaign.supplierInvoiceAmount) - collectedCents(theirs)
    if (outstanding > 0) cents += outstanding
  }
  return cents
}

/** Last calendar day of a month, with `month` 1-based. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function isoDate(year: number, month: number, day: number): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}`
}

/**
 * The next date the credit card closes, from a day of the month configured
 * once. A day that does not exist in the month falls back to its last day,
 * which is what banks do and therefore what she expects.
 *
 * Undefined when the card has not been set up, so the screen can stay quiet
 * instead of showing a date it invented.
 */
export function nextCardCutoff(today: string, day: number | undefined): string | undefined {
  if (day === undefined || !Number.isInteger(day) || day < 1 || day > 31) return undefined

  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  const dayOfMonth = Number(today.slice(8, 10))

  const thisMonth = Math.min(day, daysInMonth(year, month))
  if (dayOfMonth <= thisMonth) return isoDate(year, month, thisMonth)

  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return isoDate(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)))
}

/**
 * Customer search, duplicate merging and carried debt.
 *
 * A sale starts on TikTok as @maria23 and closes on WhatsApp as María Fernanda
 * from the 098 number, so the same person arrives under several identities and
 * duplicates are a matter of when, not if.
 */
import type { Customer, Order, OrderItem } from '../db/types'
import { earlierIso, laterIso } from './dates'
import { fromCents, orderBalanceCents, toCents } from './money'
import { digitsOf, normalizeName, normalizeText } from './text'

/** A merge is only applied by the data layer, so the domain returns the plan. */
export interface CustomerMergeResult {
  /** The surviving customer, always keeping the target id. */
  customer: Customer
  /** Orders that must be written back: rewritten source orders and combined ones. */
  orders: Order[]
  /** Source orders absorbed into a target order of the same campaign. */
  removedOrderIds: string[]
}

/** Case- and accent-insensitive match against name, aliases and whatsapp. */
export function matchesQuery(customer: Customer, query: string): boolean {
  const needle = normalizeText(query)
  if (!needle) return true

  const fields = [customer.name, ...customer.aliases, customer.whatsapp ?? '']
  if (fields.some((field) => normalizeText(field).includes(needle))) return true

  // "0987" has to find "098-765-4321", which no substring match would.
  const needleDigits = digitsOf(needle)
  if (needleDigits.length < 2) return false
  return fields.some((field) => digitsOf(field).includes(needleDigits))
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === ''
}

/** Customers stored before the contact log existed have no `contacts` at all. */
export function contactsOf(customer: Customer): string[] {
  return customer.contacts ?? []
}

function mergeAliases(target: Customer, source: Customer): string[] {
  const aliases: string[] = []
  const seen = new Set([normalizeText(target.name)])
  for (const alias of [...target.aliases, source.name, ...source.aliases]) {
    const key = normalizeText(alias)
    if (!key || seen.has(key)) continue
    seen.add(key)
    aliases.push(alias)
  }
  return aliases
}

function mergeItems(targetItems: OrderItem[], sourceItems: OrderItem[]): OrderItem[] {
  const merged = targetItems.map((item) => ({ ...item }))
  for (const item of sourceItems) {
    const key = normalizeName(item.name)
    // The target price wins: it is what the customer was already told to pay.
    const existing = merged.find((candidate) => normalizeName(candidate.name) === key)
    if (existing) existing.quantity += item.quantity
    else merged.push({ ...item })
  }
  return merged
}

function combineOrders(target: Order, source: Order): Order {
  const notes = [target.notes, source.notes].filter((note) => note && note.trim() !== '')
  return {
    ...target,
    items: mergeItems(target.items, source.items),
    paidAmount: fromCents(toCents(target.paidAmount) + toCents(source.paidAmount)),
    shippingCost: fromCents(toCents(target.shippingCost) + toCents(source.shippingCost)),
    confirmed: target.confirmed || source.confirmed,
    // Half a combined order delivered is not a delivered order: better to hand
    // it over twice than to drop it off the "por entregar" list.
    deliveredAt:
      target.deliveredAt && source.deliveredAt ? laterIso(target.deliveredAt, source.deliveredAt) : undefined,
    contacts: [...target.contacts, ...source.contacts].sort(),
    createdAt: earlierIso(target.createdAt, source.createdAt),
    ...(notes.length > 0 ? { notes: notes.join('\n') } : {}),
  }
}

/**
 * Folds `source` into `target`. Orders of the same campaign are combined into
 * one, because one order per customer per campaign is the rule that keeps a
 * single total, a single payment and a single shipping cost.
 */
export function mergeCustomers(target: Customer, source: Customer, orders: Order[]): CustomerMergeResult {
  const customer: Customer = {
    ...target,
    aliases: mergeAliases(target, source),
    contacts: [...contactsOf(target), ...contactsOf(source)].sort(),
    ...(isBlank(target.whatsapp) && !isBlank(source.whatsapp) ? { whatsapp: source.whatsapp } : {}),
    ...(isBlank(target.address) && !isBlank(source.address) ? { address: source.address } : {}),
  }

  const byCampaign = new Map<string, Order>()
  for (const order of orders) {
    if (order.customerId === target.id) byCampaign.set(order.campaignId, order)
  }

  const removedOrderIds: string[] = []
  const changedCampaigns = new Set<string>()

  for (const order of orders) {
    if (order.customerId !== source.id) continue
    changedCampaigns.add(order.campaignId)
    const counterpart = byCampaign.get(order.campaignId)
    if (!counterpart) {
      byCampaign.set(order.campaignId, { ...order, customerId: target.id })
      continue
    }
    byCampaign.set(order.campaignId, combineOrders(counterpart, order))
    removedOrderIds.push(order.id)
  }

  const touched = [...changedCampaigns]
    .map((campaignId) => byCampaign.get(campaignId))
    .filter((order): order is Order => order !== undefined)

  return { customer, orders: touched, removedOrderIds }
}

/**
 * What the customer still owes from campaigns that are no longer the active
 * one. Overpaid orders are ignored so a credit never hides a real debt.
 */
export function carriedDebt(orders: Order[], activeCampaignId?: string): number {
  let cents = 0
  for (const order of orders) {
    if (order.campaignId === activeCampaignId) continue
    const balance = orderBalanceCents(order)
    if (balance > 0) cents += balance
  }
  return fromCents(cents)
}

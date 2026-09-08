/**
 * Which message an order is asking for, and how it gets written.
 *
 * One order, one button, so one template. The order of the checks is the same
 * as the follow-up rules: the cutoff beats the money, the money beats the
 * housekeeping. The app never sends anything: it opens WhatsApp with the text
 * already typed and she hits send.
 */
import { DEFAULT_TEMPLATES, type MessageTemplate, type TemplateKey } from '../../content/templates'
import { findTemplate, itemsAsLines, renderTemplate } from '../../content/whatsapp'
import type { Campaign, Customer, Order, Setting } from '../../db/types'
import { daysBetween, orderBalance, orderBalanceCents, orderTotal, toCents } from '../../domain'
import { formatMoney } from '../../ui'
import { formatLongDate } from './format'

const CUTOFF_WARNING_DAYS = 3

/** Her edits live in settings; the defaults are only a starting point. */
export const TEMPLATE_SETTING_PREFIX = 'template.'
export const BANK_ACCOUNT_SETTING = 'bank.account'

export function templatesFrom(stored: readonly Setting[]): MessageTemplate[] {
  const overrides = new Map(stored.map((setting) => [setting.key, setting.value]))
  return DEFAULT_TEMPLATES.map((template) => {
    const override = overrides.get(`${TEMPLATE_SETTING_PREFIX}${template.key}`)
    return override && override.trim() !== '' ? { ...template, body: override } : template
  })
}

export function bankAccountFrom(stored: readonly Setting[]): string {
  return stored.find((setting) => setting.key === BANK_ACCOUNT_SETTING)?.value ?? ''
}

export function templateForOrder(
  order: Order,
  campaign: Campaign | undefined,
  today: string,
): TemplateKey {
  if (!order.confirmed) return 'confirmation'

  if (orderBalanceCents(order) > 0) {
    const daysToCutoff = campaign ? daysBetween(today, campaign.cutoffDate) : undefined
    if (daysToCutoff !== undefined && daysToCutoff >= 0 && daysToCutoff <= CUTOFF_WARNING_DAYS) {
      return 'cutoff'
    }
    return toCents(order.paidAmount) > 0 ? 'balance' : 'payment'
  }

  if (!order.deliveredAt) return campaign?.arrivedAt ? 'arrived' : 'delivery'
  return 'repurchase'
}

export interface OrderMessageInput {
  order: Order
  customer: Customer | undefined
  campaign: Campaign | undefined
  templates: readonly MessageTemplate[]
  bankAccount: string
  today: string
}

export function orderMessage({
  order,
  customer,
  campaign,
  templates,
  bankAccount,
  today,
}: OrderMessageInput): string {
  const key = templateForOrder(order, campaign, today)
  const template = findTemplate(templates, key) ?? findTemplate(DEFAULT_TEMPLATES, key)
  if (!template) return ''

  return renderTemplate(template.body, {
    // The name she would type in WhatsApp, not the one on the ID card.
    cliente: customer ? (customer.name.trim().split(/\s+/)[0] ?? customer.name) : '',
    items: itemsAsLines(order.items),
    total: formatMoney(orderTotal(order)),
    saldo: formatMoney(orderBalance(order)),
    corte: campaign ? formatLongDate(campaign.cutoffDate) : '',
    cuenta: bankAccount,
  })
}

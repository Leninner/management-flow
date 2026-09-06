/**
 * Turning a follow-up into the WhatsApp message she is about to send.
 *
 * The app never sends anything: it fills the box, she reads it and hits send.
 */
import { DEFAULT_TEMPLATES } from '../../content/templates'
import { itemsAsLines, renderTemplate, whatsappUrl } from '../../content/whatsapp'
import type { Campaign, Customer, Order, Setting } from '../../db/types'
import type { FollowUp, FollowUpTemplateKey } from '../../domain'
import { orderBalance, orderTotal } from '../../domain'
import { formatMoney } from '../../ui'
import { firstName, formatDayMonth, formatWeekday } from './format'

/** Her edits to a template live under this prefix in the settings table. */
const TEMPLATE_PREFIX = 'template.'
/** Bank details pasted into the "cuenta y total" message. */
const BANK_ACCOUNT_KEY = 'bank.account'

/**
 * Why this row is here. Short, lowercase, the way she would say it.
 *
 * The row appends the day count, and about 27 characters fit before it
 * truncates. The days are what differentiate one row from the next, so the
 * reason has to leave room for them. Nothing here repeats the header either:
 * when the cutoff is close it already says so in red across the whole screen.
 */
export const FOLLOW_UP_REASON: Record<FollowUpTemplateKey, string> = {
  cutoff: 'sin pagar',
  arrived: 'falta entregar',
  balance: 'falta el saldo',
  payment: 'no ha pagado',
  confirmation: 'sin confirmar',
  reengage: 'no ha pedido',
  repurchase: 'entregado',
}

/** Amounts only belong on rows where money is the question. */
export const FOLLOW_UP_STATUS: Record<FollowUpTemplateKey, 'owes' | 'pending' | undefined> = {
  cutoff: 'owes',
  arrived: 'pending',
  balance: 'owes',
  payment: 'owes',
  confirmation: undefined,
  reengage: undefined,
  repurchase: undefined,
}

/** Defaults overridden by whatever she edited in Más › Plantillas. */
export function buildTemplates(settingList: readonly Setting[]): Map<string, string> {
  const bodies = new Map<string, string>()
  for (const template of DEFAULT_TEMPLATES) bodies.set(template.key, template.body)
  for (const setting of settingList) {
    if (setting.key.startsWith(TEMPLATE_PREFIX)) {
      bodies.set(setting.key.slice(TEMPLATE_PREFIX.length), setting.value)
    }
  }
  return bodies
}

export function bankAccount(settingList: readonly Setting[]): string {
  return settingList.find((setting) => setting.key === BANK_ACCOUNT_KEY)?.value ?? ''
}

export interface MessageInput {
  followUp: FollowUp
  customer: Customer
  /** Absent for a reengage: there is no order yet, that is the point. */
  order: Order | undefined
  campaign: Campaign | undefined
  templates: Map<string, string>
  account: string
  today: string
}

/**
 * Every placeholder the templates know about is filled; the ones a given
 * template does not use cost nothing, and a missing one collapses to nothing
 * rather than leaving "{saldo}" in her message.
 */
export function renderFollowUpMessage(input: MessageInput): string {
  const { followUp, customer, order, campaign, templates, account, today } = input
  const body = templates.get(followUp.templateKey) ?? ''

  return renderTemplate(body, {
    cliente: firstName(customer.name),
    items: order ? itemsAsLines(order.items) : '',
    total: order ? formatMoney(orderTotal(order)) : '',
    saldo: order ? formatMoney(orderBalance(order)) : '',
    corte: campaign ? formatDayMonth(campaign.cutoffDate) : '',
    dia: formatWeekday(today),
    cuenta: account,
  })
}

/** Opens WhatsApp with the message already typed in. */
export function openWhatsapp(customer: Customer, message: string): void {
  window.open(whatsappUrl(customer.whatsapp, message), '_blank', 'noopener,noreferrer')
}

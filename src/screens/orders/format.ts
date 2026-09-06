/**
 * Dates as she reads them out loud: "3 sept", "hace 2 días".
 *
 * Every date in the app is an ISO string, and `new Date('2026-09-12')` is
 * parsed as UTC midnight, which in Ecuador prints as the day before. So the
 * calendar day is pulled apart by hand and rebuilt in local time.
 */
import type { Order } from '../../db/types'
import { daysBetween, orderBalanceCents, toCents } from '../../domain'
import { formatMoney } from '../../ui'

const SHORT = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short' })
const LONG = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long' })

function localDay(iso: string): Date {
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  return new Date(year, month - 1, day)
}

/** "3 sept" */
export function formatShortDate(iso: string): string {
  return SHORT.format(localDay(iso)).replace('.', '')
}

/** "3 de septiembre" */
export function formatLongDate(iso: string): string {
  return LONG.format(localDay(iso))
}

/**
 * The calendar day where she is standing, not where UTC is. A live at 8pm in
 * Ambato is already tomorrow in UTC, and a countdown to the cutoff that jumps
 * a day every evening is a countdown she stops trusting.
 */
export function todayIso(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** "hoy", "ayer", "hace 5 días" */
export function daysAgoLabel(iso: string, today: string): string {
  const days = Math.max(0, daysBetween(iso, today))
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}

/**
 * The supporting line of a row: what is missing, in her words. The colour of
 * the row already said it; this is the backup for the same information.
 */
export function orderStateLine(order: Order, today: string): string {
  if (!order.confirmed) return `sin confirmar · ${daysAgoLabel(order.createdAt, today)}`
  if (orderBalanceCents(order) > 0) {
    return toCents(order.paidAmount) > 0 ? `abonó ${formatMoney(order.paidAmount)}` : 'no ha pagado'
  }
  if (!order.deliveredAt) return 'pagado · falta entregar'
  return `entregado ${formatShortDate(order.deliveredAt)}`
}

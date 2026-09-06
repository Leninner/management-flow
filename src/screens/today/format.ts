/**
 * Formatting for the things the screens say out loud.
 *
 * Every date in the app is an ISO string. Parsing one with `new Date(iso)`
 * would read it as UTC and, five hours west of it, print the day before, so
 * the calendar parts are pulled out by hand and handed to a local Date.
 */

const DAY_MONTH = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long' })
const WEEKDAY = new Intl.DateTimeFormat('es-EC', { weekday: 'long' })

function toLocalDate(iso: string): Date {
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  return new Date(year, month - 1, day)
}

/** "12 de septiembre", the way she would write the cutoff in a message. */
export function formatDayMonth(iso: string): string {
  return DAY_MONTH.format(toLocalDate(iso))
}

/** "viernes". */
export function formatWeekday(iso: string): string {
  return WEEKDAY.format(toLocalDate(iso))
}

/**
 * The calendar day where she is standing, not where UTC is. A live at 8pm in
 * Ambato is already tomorrow in UTC, and a countdown that jumps a day every
 * evening is a countdown she stops trusting.
 */
export function todayIso(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** "hoy", "1 día", "4 días". */
export function daysLabel(days: number): string {
  if (days <= 0) return 'hoy'
  if (days === 1) return '1 día'
  return `${days} días`
}

/** The name she would type in WhatsApp, not the one in the ID card. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

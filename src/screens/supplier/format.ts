/** Dates on screen. Stored ISO, read out loud in Spanish. */

const DAY_MONTH = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long' })

/**
 * A date-only string is a calendar day: parsing "2026-09-20" with `new Date`
 * lands on UTC midnight, which in Ecuador reads as the day before. A full
 * timestamp is a real instant and belongs in her own timezone.
 */
function toLocalDate(iso: string): Date {
  if (iso.length > 10) return new Date(iso)
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  return new Date(year, month - 1, day)
}

export function formatDay(iso: string): string {
  return DAY_MONTH.format(toLocalDate(iso))
}

export function plural(count: number, singular: string, many: string): string {
  return `${count} ${count === 1 ? singular : many}`
}

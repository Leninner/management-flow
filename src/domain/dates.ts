/**
 * Date helpers. Every date in the app is an ISO string, so comparisons are
 * lexicographic and day arithmetic never touches the local timezone.
 */

const MS_PER_DAY = 86_400_000

/** Whole days since the epoch for the calendar day inside an ISO string. */
function dayIndex(iso: string): number {
  const date = iso.slice(0, 10)
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const day = Number(date.slice(8, 10))
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY)
}

/** Calendar days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return dayIndex(to) - dayIndex(from)
}

/** The later of two ISO dates. */
export function laterIso(a: string, b: string): string {
  return a >= b ? a : b
}

/** The earlier of two ISO dates. */
export function earlierIso(a: string, b: string): string {
  return a <= b ? a : b
}

export function nowIso(): string {
  return new Date().toISOString()
}

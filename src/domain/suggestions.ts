/**
 * The emergent product catalogue.
 *
 * There is no product table: loading the Oriflame catalogue before being able
 * to sell would be the worst possible friction. She types "38588" and the last
 * sale of "38588 Novage" comes back with its price. The catalogue builds itself
 * and is never maintained.
 */
import { daysBetween } from './dates'
import { normalizeName, normalizeText } from './text'

/** One line of history: an order item plus the date of the order it came from. */
export interface PastItem {
  name: string
  price: number
  usedAt: string
}

export interface ProductSuggestion {
  name: string
  /** Price of the most recent sale, which is the one worth repeating. */
  price: number
  lastUsedAt: string
  timesUsed: number
}

/**
 * Ranks the history by recency and frequency. Recency is measured against the
 * newest entry in the history itself, so the ranking needs no clock and two
 * runs over the same data always agree.
 */
export function productSuggestions(pastItems: PastItem[], query: string, limit?: number): ProductSuggestion[] {
  const byProduct = new Map<string, ProductSuggestion>()

  for (const item of pastItems) {
    const key = normalizeName(item.name)
    if (!key) continue
    const existing = byProduct.get(key)
    if (!existing) {
      byProduct.set(key, { name: item.name.trim(), price: item.price, lastUsedAt: item.usedAt, timesUsed: 1 })
      continue
    }
    existing.timesUsed += 1
    if (item.usedAt >= existing.lastUsedAt) {
      existing.name = item.name.trim()
      existing.price = item.price
      existing.lastUsedAt = item.usedAt
    }
  }

  const needle = normalizeText(query)
  const matches = [...byProduct.values()].filter((suggestion) => normalizeName(suggestion.name).includes(needle))
  if (matches.length === 0) return []

  const newest = matches.reduce((latest, item) => (item.lastUsedAt > latest ? item.lastUsedAt : latest), '')
  const score = (suggestion: ProductSuggestion) =>
    suggestion.timesUsed / (1 + Math.max(0, daysBetween(suggestion.lastUsedAt, newest)))
  const startsWithQuery = (suggestion: ProductSuggestion) =>
    needle !== '' && normalizeName(suggestion.name).startsWith(needle)

  const ranked = matches.sort(
    (a, b) =>
      Number(startsWithQuery(b)) - Number(startsWithQuery(a)) ||
      score(b) - score(a) ||
      b.lastUsedAt.localeCompare(a.lastUsedAt) ||
      a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }),
  )

  return limit === undefined ? ranked : ranked.slice(0, limit)
}

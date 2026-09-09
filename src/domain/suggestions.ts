/**
 * The emergent product catalogue.
 *
 * There is no product table: loading the Oriflame catalogue before being able
 * to sell would be the worst possible friction. She types "38588" and the last
 * sale of "38588 Novage" comes back with its price. The catalogue builds itself
 * and is never maintained.
 */
import { daysBetween } from './dates'
import { normalizeText, productKey, productLabel } from './text'

/** One line of history: an order item plus the date of the order it came from. */
export interface PastItem {
  code?: string
  name: string
  /** Absent when the line was written during a live and priced later. */
  price?: number
  usedAt: string
}

export interface ProductSuggestion {
  code?: string
  name: string
  /**
   * Price of the most recent sale. Absent when the last time she sold it she
   * had not written a price either, and also the reason the screen must offer
   * it as a suggestion to confirm rather than as a value already filled in:
   * prices change between campaigns.
   */
  price?: number
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
    const key = productKey(item)
    if (!key) continue
    const existing = byProduct.get(key)
    if (!existing) {
      byProduct.set(key, {
        ...(item.code ? { code: item.code } : {}),
        name: item.name.trim(),
        ...(item.price === undefined ? {} : { price: item.price }),
        lastUsedAt: item.usedAt,
        timesUsed: 1,
      })
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
  const searchable = (suggestion: ProductSuggestion) => normalizeText(productLabel(suggestion))
  const matches = [...byProduct.values()].filter((suggestion) => searchable(suggestion).includes(needle))
  if (matches.length === 0) return []

  const newest = matches.reduce((latest, item) => (item.lastUsedAt > latest ? item.lastUsedAt : latest), '')
  const score = (suggestion: ProductSuggestion) =>
    suggestion.timesUsed / (1 + Math.max(0, daysBetween(suggestion.lastUsedAt, newest)))
  const startsWithQuery = (suggestion: ProductSuggestion) =>
    needle !== '' && searchable(suggestion).startsWith(needle)

  const ranked = matches.sort(
    (a, b) =>
      Number(startsWithQuery(b)) - Number(startsWithQuery(a)) ||
      score(b) - score(a) ||
      b.lastUsedAt.localeCompare(a.lastUsedAt) ||
      productLabel(a).localeCompare(productLabel(b), 'es', { numeric: true, sensitivity: 'base' }),
  )

  return limit === undefined ? ranked : ranked.slice(0, limit)
}

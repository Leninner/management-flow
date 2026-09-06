import { describe, expect, it } from 'vitest'
import { productSuggestions } from './suggestions'

const history = [
  { name: '38588 Novage', price: 11.5, usedAt: '2026-07-01' },
  { name: '38588 Novage', price: 12.9, usedAt: '2026-08-20' },
  { name: '42102 Labial The One', price: 7.5, usedAt: '2026-08-25' },
  { name: 'Crema Milk & Honey', price: 9, usedAt: '2026-06-01' },
]

describe('productSuggestions', () => {
  it('brings back the product and its last price from the Oriflame code', () => {
    expect(productSuggestions(history, '38588')).toEqual([
      { name: '38588 Novage', price: 12.9, lastUsedAt: '2026-08-20', timesUsed: 2 },
    ])
  })

  it('matches ignoring case and accents', () => {
    expect(productSuggestions(history, 'milk').map((item) => item.name)).toEqual(['Crema Milk & Honey'])
    expect(productSuggestions([{ name: 'Máscara Volumen', price: 8, usedAt: '2026-08-01' }], 'mascara')).toHaveLength(1)
  })

  it('returns the whole catalogue when the query is empty', () => {
    expect(productSuggestions(history, '')).toHaveLength(3)
  })

  it('collapses names that differ only in case or padding', () => {
    const suggestions = productSuggestions(
      [
        { name: '38588 Novage', price: 11.5, usedAt: '2026-07-01' },
        { name: '  38588 NOVAGE ', price: 12.9, usedAt: '2026-08-20' },
      ],
      '38588',
    )
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]?.timesUsed).toBe(2)
  })

  it('keeps the price of the most recent sale, not the first one', () => {
    expect(productSuggestions(history, '38588')[0]?.price).toBe(12.9)
  })

  it('ranks a product used often above one used once at the same time', () => {
    const suggestions = productSuggestions(
      [
        { name: 'Labial A', price: 5, usedAt: '2026-08-01' },
        { name: 'Labial A', price: 5, usedAt: '2026-09-01' },
        { name: 'Labial B', price: 5, usedAt: '2026-09-01' },
      ],
      'labial',
    )
    expect(suggestions.map((item) => item.name)).toEqual(['Labial A', 'Labial B'])
  })

  it('ranks a recent product above an older one used the same number of times', () => {
    const suggestions = productSuggestions(
      [
        { name: 'Labial viejo', price: 5, usedAt: '2026-01-01' },
        { name: 'Labial nuevo', price: 5, usedAt: '2026-09-01' },
      ],
      'labial',
    )
    expect(suggestions.map((item) => item.name)).toEqual(['Labial nuevo', 'Labial viejo'])
  })

  it('prefers a product whose name starts with the query', () => {
    const suggestions = productSuggestions(
      [
        { name: 'Crema con Novage', price: 5, usedAt: '2026-09-02' },
        { name: 'Novage Ecollagen', price: 5, usedAt: '2026-09-01' },
      ],
      'novage',
    )
    expect(suggestions.map((item) => item.name)).toEqual(['Novage Ecollagen', 'Crema con Novage'])
  })

  it('honours a limit', () => {
    expect(productSuggestions(history, '', 2)).toHaveLength(2)
  })

  it('returns nothing for a query that matches no product', () => {
    expect(productSuggestions(history, 'perfume')).toEqual([])
  })

  it('handles an empty history', () => {
    expect(productSuggestions([], '38588')).toEqual([])
  })
})

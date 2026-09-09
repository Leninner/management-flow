/** Text normalisation shared by search, product matching and merging. */

const COMBINING_MARKS = /[\u0300-\u036f]/g
const WHITESPACE = /\s+/g
const NON_DIGIT = /\D/g

/** Lowercase, accent-free, trimmed: "María" and "maria" become the same string. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim()
}

/**
 * Identity of a product line. Two items are the same product when their names
 * only differ in case, accents or spacing.
 */
export function normalizeName(value: string): string {
  return normalizeText(value).replace(WHITESPACE, ' ')
}

/** Phone numbers are typed with spaces, dashes and country codes; digits are not. */
export function digitsOf(value: string): string {
  return value.replace(NON_DIGIT, '')
}

/** Oriflame codes are five or six digits and lead the line she types. */
const LEADING_CODE = /^(\d{5,6})\b[\s.,;:-]*(.*)$/s

export interface SplitProduct {
  /** Absent when the text does not start with something shaped like a code. */
  code?: string
  name: string
}

/**
 * Pulls the Oriflame code out of "38588 Novage Ecollagen".
 *
 * Anything that does not start with five or six digits stays whole in `name`:
 * items written before codes existed, and the occasional thing she sells
 * without one, are not products to be guessed at.
 */
export function splitProductCode(value: string): SplitProduct {
  const trimmed = value.trim()
  const match = LEADING_CODE.exec(trimmed)
  if (!match) return { name: trimmed }
  const code = match[1] ?? ''
  const name = (match[2] ?? '').trim()
  // A bare code is a product whose name she has not written yet, not a nameless
  // line: keeping the code as the name is what lets her recognise it later.
  return name === '' ? { code, name: code } : { code, name }
}

/** How a product line reads back to her: "38588 Novage Ecollagen". */
export function productLabel(product: { code?: string; name: string }): string {
  if (!product.code) return product.name
  return product.name === product.code ? product.code : `${product.code} ${product.name}`
}

/**
 * Identity of a product line. The code wins whenever there is one: two people
 * writing the same product differently is the normal case, and the code is the
 * only thing Oriflame agrees with her about.
 */
export function productKey(product: { code?: string; name: string }): string {
  return product.code ? `#${product.code}` : normalizeName(product.name)
}

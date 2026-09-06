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

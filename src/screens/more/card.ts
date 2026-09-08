/**
 * Her credit card, as two numbers.
 *
 * She pays the Oriflame invoice with it, so the card is the deadline the money
 * has to come back by. A day of the month is configured once and holds forever;
 * a date typed per campaign is a date she eventually forgets to type.
 */
export const CARD_CUTOFF_DAY_KEY = 'card.cutoffDay'
export const CARD_DUE_DAY_KEY = 'card.dueDay'

/** Undefined for anything that is not a real day of a month. */
export function readDayOfMonth(
  values: ReadonlyMap<string, string>,
  key: string,
): number | undefined {
  const raw = values.get(key)
  if (raw === undefined) return undefined
  const day = Number(raw)
  if (!Number.isInteger(day) || day < 1 || day > 31) return undefined
  return day
}

export interface CardSettings {
  cutoffDay: number | undefined
  dueDay: number | undefined
}

export function readCardSettings(values: ReadonlyMap<string, string>): CardSettings {
  return {
    cutoffDay: readDayOfMonth(values, CARD_CUTOFF_DAY_KEY),
    dueDay: readDayOfMonth(values, CARD_DUE_DAY_KEY),
  }
}

/** "corta el 15" / "corta el 15, se paga el 30". The row subtitle. */
export function cardSummary({ cutoffDay, dueDay }: CardSettings): string | undefined {
  if (cutoffDay === undefined) return undefined
  if (dueDay === undefined) return `corta el ${cutoffDay}`
  return `corta el ${cutoffDay}, se paga el ${dueDay}`
}

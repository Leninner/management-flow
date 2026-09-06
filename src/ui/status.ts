/**
 * The three states of the whole app. Colour carries them, not words: red owes
 * money, amber is waiting to be delivered, green is finished.
 *
 * Accessibility note that drives every map below: on white, only red clears
 * AA at body size (4.8:1). Amber (3.2:1) and green (3.3:1) clear it only as
 * large text. So the saturated tones are used for dots, for tinted fills and
 * for the big amounts, and never for small type.
 */
export type Status = 'owes' | 'pending' | 'done'

export const STATUSES: readonly Status[] = ['owes', 'pending', 'done']

/** Short enough to never wrap. The colour is the message; this is the backup. */
export const STATUS_LABEL: Record<Status, string> = {
  owes: 'Debe',
  pending: 'Por entregar',
  done: 'Listo',
}

/** Saturated fill. Dots and solid buttons only. */
export const STATUS_SOLID: Record<Status, string> = {
  owes: 'bg-owes',
  pending: 'bg-pending',
  done: 'bg-done',
}

/** Tinted fill. Always paired with ink text, so it is always readable. */
export const STATUS_SOFT: Record<Status, string> = {
  owes: 'bg-owes-soft',
  pending: 'bg-pending-soft',
  done: 'bg-done-soft',
}

/** Saturated text. Large sizes only, except red which is safe anywhere. */
export const STATUS_TEXT: Record<Status, string> = {
  owes: 'text-owes',
  pending: 'text-pending',
  done: 'text-done',
}

/** Darkened for small type sitting on a soft fill. Safe at any size. */
export const STATUS_INK: Record<Status, string> = {
  owes: 'text-owes-ink',
  pending: 'text-pending-ink',
  done: 'text-done-ink',
}

export const STATUS_BORDER: Record<Status, string> = {
  owes: 'border-owes',
  pending: 'border-pending',
  done: 'border-done',
}

/**
 * The messages, shown the way they will arrive.
 *
 * She never sees a placeholder. `{cliente}` is a thing a programmer reads;
 * what she needs to know is that the message will say the person's name, and
 * the only convincing way to say that is to show it saying one.
 */
import { renderTemplate } from '../../content/whatsapp'

/** What each hole is called in her words. */
export const PLACEHOLDER_LABEL: Record<string, string> = {
  '{cliente}': 'nombre',
  '{items}': 'lo que se lleva',
  '{total}': 'total',
  '{saldo}': 'saldo',
  '{corte}': 'fecha de corte',
  '{dia}': 'día del live',
  '{cuenta}': 'mi cuenta',
}

/**
 * A pedido that could be real: a name from Ambato, two products, an amount
 * with cents. Round numbers and "Cliente 1" read as a demo and stop being
 * believable, which is the one thing this preview has to be.
 */
const SAMPLE = {
  cliente: 'Karla',
  items: '• 2x 38588 Novage Ecollagen\n• 1x 42102 Labial The One',
  total: '$34.30',
  saldo: '$12.40',
  corte: '8 de septiembre',
  dia: 'viernes',
} as const

export function previewTemplate(body: string, bankAccount: string): string {
  return renderTemplate(body, {
    ...SAMPLE,
    // Her real account when she has one: seeing her own bank details is what
    // tells her the message is finished.
    cuenta: bankAccount.trim() === '' ? 'Tus datos de cuenta' : bankAccount,
  })
}

/**
 * The two directions of the same message.
 *
 * `{cliente}` is the storage format and it never changes: every stored edit,
 * every default and all the sending code speak it. But it is unreadable to
 * her, so the box she types in speaks «nombre» and gets translated on the way
 * in and on the way out.
 */
export function toHuman(body: string): string {
  let text = body
  for (const [placeholder, label] of Object.entries(PLACEHOLDER_LABEL)) {
    text = text.split(placeholder).join(`\u00ab${label}\u00bb`)
  }
  return text
}

export function toStorage(text: string): string {
  let body = text
  for (const [placeholder, label] of Object.entries(PLACEHOLDER_LABEL)) {
    body = body.split(`\u00ab${label}\u00bb`).join(placeholder)
  }
  return body
}

/** What the chips insert: the readable form, since that is what she sees. */
export function humanToken(placeholder: string): string {
  const label = PLACEHOLDER_LABEL[placeholder]
  return label === undefined ? placeholder : `\u00ab${label}\u00bb`
}

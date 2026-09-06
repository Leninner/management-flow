import type { MessageTemplate } from './templates'

export interface TemplateVars {
  cliente?: string
  items?: string
  total?: string
  saldo?: string
  corte?: string
  dia?: string
  cuenta?: string
  courier?: string
  guia?: string
}

/** Replaces {placeholders}. Unknown or missing ones collapse to nothing. */
export function renderTemplate(body: string, vars: TemplateVars): string {
  return body
    .replace(/\{(\w+)\}/g, (_, key: string) => vars[key as keyof TemplateVars] ?? '')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

/**
 * Ecuadorian numbers are saved as 09xxxxxxxx but wa.me needs the country code
 * without a plus sign.
 */
export function toWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('593')) return digits
  if (digits.startsWith('0')) return `593${digits.slice(1)}`
  return digits
}

/**
 * Opens WhatsApp with the message already typed. The app never sends anything
 * on its own: she reads it and hits send.
 */
export function whatsappUrl(phone: string | undefined, message: string): string {
  const text = encodeURIComponent(message)
  if (!phone) return `https://wa.me/?text=${text}`
  return `https://wa.me/${toWhatsappNumber(phone)}?text=${text}`
}

export function itemsAsLines(items: readonly { name: string; quantity: number }[]): string {
  return items.map((i) => `• ${i.quantity}x ${i.name}`).join('\n')
}

export function findTemplate(
  templates: readonly MessageTemplate[],
  key: string,
): MessageTemplate | undefined {
  return templates.find((t) => t.key === key)
}

/**
 * Default WhatsApp message templates.
 *
 * Written to sound like a person typing on a phone in Ambato, not like a
 * store. They are only defaults: she edits them from the settings screen and
 * her edits live in the `settings` table.
 *
 * Placeholders are replaced verbatim: {cliente} {items} {total} {saldo}
 * {corte} {dia} {cuenta} {courier} {guia}
 */

export type TemplateKey =
  | 'confirmation'
  | 'delivery'
  | 'payment'
  | 'cutoff'
  | 'balance'
  | 'arrived'
  | 'shipped'
  | 'repurchase'
  | 'reengage'

export interface MessageTemplate {
  key: TemplateKey
  /** Shown in the settings list. Two or three words, no sentences. */
  label: string
  body: string
}

export const DEFAULT_TEMPLATES: readonly MessageTemplate[] = [
  {
    key: 'confirmation',
    label: 'Confirmar pedido',
    body: 'Hola {cliente}! Te anoté esto del live:\n{items}\nSon {total}. ¿Te lo confirmo?',
  },
  {
    key: 'delivery',
    label: 'Datos de entrega',
    body: '{cliente}, ¿lo retiras aquí en Ambato o te lo mando?\nSi es envío pásame la dirección con una referencia y a qué nombre.',
  },
  {
    key: 'payment',
    label: 'Cuenta y total',
    body: '{cliente}, quedó en {total}.\n{cuenta}\nCuando hagas la transferencia me mandas la captura y te confirmo.',
  },
  {
    key: 'cutoff',
    label: 'Se acerca el corte',
    body: '{cliente}, el catálogo cierra el {corte}. Si querías aumentar algo dime hasta ahí, después ya no alcanzo a meterlo en este pedido.',
  },
  {
    key: 'balance',
    label: 'Saldo pendiente',
    body: '{cliente}, de tu pedido quedan {saldo}. Sin apuro, es para no perderme la cuenta.',
  },
  {
    key: 'arrived',
    label: 'Ya llegó',
    body: '{cliente}, ya llegó tu pedido. ¿Cuándo te queda bien pasar a retirarlo?',
  },
  {
    key: 'shipped',
    label: 'Ya salió el envío',
    body: '{cliente}, ya salió tu envío por {courier}. La guía es {guia}, con eso lo rastreas.',
  },
  {
    key: 'repurchase',
    label: 'Catálogo nuevo',
    body: 'Hola {cliente}, ya salió el catálogo nuevo. Me acordé de ti porque llegó algo parecido a lo que llevaste, ¿te mando la foto?',
  },
  {
    key: 'reengage',
    label: 'Invitar al live',
    body: '{cliente}, ¿cómo has estado? Hago live este {dia} por si te quieres ver algo. Si prefieres te paso el catálogo por aquí.',
  },
]

/**
 * Default WhatsApp message templates.
 *
 * Written to sound like a person typing on a phone in Ambato, not like a
 * store. They are only defaults: she edits them from the settings screen and
 * her edits live in the `settings` table.
 *
 * Placeholders are replaced verbatim: {cliente} {items} {total} {saldo}
 * {corte} {dia} {cuenta}
 */

export type TemplateKey =
  | 'confirmation'
  | 'delivery'
  | 'payment'
  | 'cutoff'
  | 'balance'
  | 'arrived'
  | 'repurchase'
  | 'reengage'

export interface MessageTemplate {
  key: TemplateKey
  body: string
}

/**
 * One name per message, everywhere she meets it: the list in Más, the title of
 * the editor and the button of a pedido that is about to send it. There used
 * to be two lists -- "Cuenta y total" in the settings, "Pedir el pago" on the
 * button -- so she edited one message and watched a differently named one go
 * out.
 *
 * They are verbs, because in all three places what she needs to know is what
 * she is about to say. "Confirmar pedido" in particular is not among them: the
 * pedido screen already has a button by that name that confirms the order
 * without writing to anybody, and two identical labels doing different things
 * on one screen is how an app stops being trusted.
 */
export const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  confirmation: 'Pedir que confirme',
  delivery: 'Preguntar la entrega',
  payment: 'Pedir el pago',
  cutoff: 'Avisar del cierre',
  balance: 'Recordar el saldo',
  arrived: 'Avisar que llegó',
  repurchase: 'Ofrecer de nuevo',
  reengage: 'Invitar al live',
}

export const DEFAULT_TEMPLATES: readonly MessageTemplate[] = [
  {
    key: 'confirmation',
    body: 'Hola {cliente}! Te anoté esto del live:\n{items}\nSon {total}. ¿Te lo confirmo?',
  },
  {
    key: 'delivery',
    body: '{cliente}, ¿lo retiras aquí en Ambato o te lo mando?\nSi es envío pásame la dirección con una referencia y a qué nombre.',
  },
  {
    key: 'payment',
    body: '{cliente}, quedó en {total}.\n{cuenta}\nCuando hagas la transferencia me mandas la captura y te confirmo.',
  },
  {
    key: 'cutoff',
    body: '{cliente}, el catálogo cierra el {corte}. Si querías aumentar algo dime hasta ahí, después ya no alcanzo a meterlo en este pedido.',
  },
  {
    key: 'balance',
    body: '{cliente}, de tu pedido quedan {saldo}. Sin apuro, es para no perderme la cuenta.',
  },
  {
    key: 'arrived',
    body: '{cliente}, ya llegó tu pedido. ¿Cuándo te queda bien pasar a retirarlo?',
  },
  {
    key: 'repurchase',
    body: 'Hola {cliente}, ya salió el catálogo nuevo. Me acordé de ti porque llegó algo parecido a lo que llevaste, ¿te mando la foto?',
  },
  {
    key: 'reengage',
    body: '{cliente}, ¿cómo has estado? Hago live este {dia} por si te quieres ver algo. Si prefieres te paso el catálogo por aquí.',
  },
]

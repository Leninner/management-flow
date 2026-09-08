/**
 * Her messages. The defaults show through until she edits one; an edit is a
 * row in `settings` keyed by the template, so resetting is deleting that row.
 */
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_LABEL,
  type MessageTemplate,
  type TemplateKey,
} from '../../content/templates'

export function templateSettingKey(key: TemplateKey): string {
  return `template.${key}`
}

/** What each message can actually fill in. */
export const TEMPLATE_PLACEHOLDERS: Record<TemplateKey, readonly string[]> = {
  confirmation: ['{cliente}', '{items}', '{total}'],
  delivery: ['{cliente}'],
  payment: ['{cliente}', '{total}', '{saldo}', '{cuenta}'],
  cutoff: ['{cliente}', '{corte}'],
  balance: ['{cliente}', '{saldo}', '{total}'],
  arrived: ['{cliente}'],
  repurchase: ['{cliente}'],
  reengage: ['{cliente}', '{dia}'],
}

export interface EditableTemplate {
  template: MessageTemplate
  /** The one name this message carries everywhere. */
  label: string
  /** Her version when she wrote one, the default when she has not. */
  body: string
  edited: boolean
  placeholders: readonly string[]
}

export function resolveTemplates(overrides: ReadonlyMap<string, string>): EditableTemplate[] {
  return DEFAULT_TEMPLATES.map((template) => {
    const override = overrides.get(templateSettingKey(template.key))
    return {
      template,
      label: TEMPLATE_LABEL[template.key],
      body: override ?? template.body,
      edited: override !== undefined && override !== template.body,
      placeholders: TEMPLATE_PLACEHOLDERS[template.key],
    }
  })
}

/** The row preview. One line is all a row can hold. */
export function firstLine(body: string): string {
  return body.split('\n')[0] ?? body
}

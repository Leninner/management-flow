/**
 * Editing one message.
 *
 * Two things make this readable to someone who has never seen a template: the
 * data she can drop in is named in Spanish instead of `{cliente}`, and under
 * the box there is the message as it will actually arrive, with a name and an
 * amount in it. Without the preview the braces are just noise she avoids.
 */
import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { TemplateKey } from '../../content/templates'
import { BigButton, Sheet } from '../../ui'
import { Chip, TextArea } from './fields'
import { humanToken, PLACEHOLDER_LABEL, previewTemplate, toHuman, toStorage } from './preview'
import type { EditableTemplate } from './templates'

export interface TemplateSheetProps {
  /** Null closes the sheet. The last one stays drawn while it slides away. */
  template: EditableTemplate | null
  /** Shown inside the preview, so she reads her own bank details there. */
  bankAccount: string
  onClose: () => void
  onSave: (key: TemplateKey, body: string) => void
}

export function TemplateSheet({ template, bankAccount, onClose, onSave }: TemplateSheetProps) {
  const [current, setCurrent] = useState<EditableTemplate | null>(template)
  const [draft, setDraft] = useState(toHuman(template?.body ?? ''))
  const wasOpen = useRef(false)
  const area = useRef<HTMLTextAreaElement>(null)

  // Only the closed -> open edge reloads the draft. A live query landing mid
  // typing must not wipe what she is writing.
  useEffect(() => {
    if (template && !wasOpen.current) {
      setCurrent(template)
      setDraft(toHuman(template.body))
    }
    wasOpen.current = template !== null
  }, [template])

  if (!current) return null

  const original = current.template.body
  const body = toStorage(draft)
  const changed = body !== original

  function insert(placeholder: string) {
    const field = area.current
    if (!field) {
      setDraft((body) => body + placeholder)
      return
    }
    const start = field.selectionStart
    const end = field.selectionEnd
    setDraft((body) => body.slice(0, start) + placeholder + body.slice(end))
    const caret = start + placeholder.length
    requestAnimationFrame(() => {
      field.focus()
      field.setSelectionRange(caret, caret)
    })
  }

  return (
    <Sheet
      open={template !== null}
      onClose={onClose}
      title={current.template.label}
      footer={
        <BigButton floating={false} onClick={() => onSave(current.template.key, body)}>
          Guardar
        </BigButton>
      }
    >
      <div className="flex flex-col gap-4">
        <TextArea
          ref={area}
          value={draft}
          onChange={setDraft}
          label={current.template.label}
          rows={6}
        />

        <div className="flex flex-col gap-2">
          <span className="px-1 text-[0.9375rem] font-semibold text-muted">Agregar un dato</span>
          <div className="flex flex-wrap gap-2">
            {current.placeholders.map((placeholder) => (
              <Chip key={placeholder} onClick={() => insert(humanToken(placeholder))}>
                {PLACEHOLDER_LABEL[placeholder] ?? placeholder}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="px-1 text-[0.9375rem] font-semibold text-muted">Así le llega</span>
          <div className="rounded-card bg-card p-3 shadow-card">
            <p className="ml-auto max-w-[17rem] rounded-[1.25rem] rounded-br-md bg-brand-soft px-4 py-3 text-[1.0625rem] leading-snug whitespace-pre-line text-ink">
              {previewTemplate(body, bankAccount)}
            </p>
          </div>
        </div>

        {changed && (
          <BigButton
            floating={false}
            variant="quiet"
            icon={RotateCcw}
            onClick={() => setDraft(toHuman(original))}
          >
            Volver a la original
          </BigButton>
        )}
      </div>
    </Sheet>
  )
}

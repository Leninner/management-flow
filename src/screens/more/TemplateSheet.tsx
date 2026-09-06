/**
 * Editing one message. The placeholder chips are the one piece of explanation
 * in the whole app that earns its keep: nothing else on screen can tell her
 * that typing {saldo} is what puts the amount in the message.
 */
import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { TemplateKey } from '../../content/templates'
import { BigButton, Sheet } from '../../ui'
import { Chip, TextArea } from './fields'
import type { EditableTemplate } from './templates'

export interface TemplateSheetProps {
  /** Null closes the sheet. The last one stays drawn while it slides away. */
  template: EditableTemplate | null
  onClose: () => void
  onSave: (key: TemplateKey, body: string) => void
}

export function TemplateSheet({ template, onClose, onSave }: TemplateSheetProps) {
  const [current, setCurrent] = useState<EditableTemplate | null>(template)
  const [draft, setDraft] = useState(template?.body ?? '')
  const wasOpen = useRef(false)
  const area = useRef<HTMLTextAreaElement>(null)

  // Only the closed -> open edge reloads the draft. A live query landing mid
  // typing must not wipe what she is writing.
  useEffect(() => {
    if (template && !wasOpen.current) {
      setCurrent(template)
      setDraft(template.body)
    }
    wasOpen.current = template !== null
  }, [template])

  if (!current) return null

  const original = current.template.body
  const changed = draft !== original

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
        <BigButton floating={false} onClick={() => onSave(current.template.key, draft)}>
          Guardar
        </BigButton>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {current.placeholders.map((placeholder) => (
            <Chip key={placeholder} onClick={() => insert(placeholder)}>
              {placeholder}
            </Chip>
          ))}
        </div>

        <TextArea
          ref={area}
          value={draft}
          onChange={setDraft}
          label={current.template.label}
          rows={8}
        />

        {changed && (
          <BigButton
            floating={false}
            variant="quiet"
            icon={RotateCcw}
            onClick={() => setDraft(original)}
          >
            Volver a la original
          </BigButton>
        )}
      </div>
    </Sheet>
  )
}

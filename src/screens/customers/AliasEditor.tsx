/**
 * Los alias. This is where the sale that started on TikTok as @maria23 and
 * closed on WhatsApp as María Fernanda becomes one person.
 *
 * It used to sit expanded on the customer screen, above everything else. That
 * cost two hundred pixels of open form at the top of every profile for a list
 * that is usually empty and gets touched once per person, so it moved in here,
 * next to the name and the phone it belongs with.
 */
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { TextField } from '../../ui'

export interface AliasEditorProps {
  aliases: readonly string[]
  onAdd: (alias: string) => void
  onRemove: (alias: string) => void
}

export function AliasEditor({ aliases, onAdd, onRemove }: AliasEditorProps) {
  const [draft, setDraft] = useState('')

  function add() {
    const alias = draft.trim()
    if (alias === '') return
    onAdd(alias)
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="px-1 text-[0.9375rem] font-medium text-muted">Alias</span>

      {aliases.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {aliases.map((alias) => (
            <span
              key={alias}
              className="flex min-h-11 items-center gap-1 rounded-full bg-brand-soft py-1 pr-1 pl-4 text-[1.0625rem] font-semibold text-brand"
            >
              {alias}
              <button
                type="button"
                onClick={() => onRemove(alias)}
                aria-label={`Quitar ${alias}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand active:bg-card"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <TextField
          className="min-w-0 flex-1"
          value={draft}
          onChange={setDraft}
          placeholder="@usuario o celular"
          onSubmit={add}
        />
        <button
          type="button"
          onClick={add}
          disabled={draft.trim() === ''}
          aria-label="Agregar alias"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-field bg-brand text-white disabled:opacity-40"
        >
          <Plus size={26} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

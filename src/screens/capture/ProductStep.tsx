import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { PastItem } from '../../domain'
import { productSuggestions } from '../../domain'
import { BigButton, formatMoney, Row, SearchField, Sheet } from '../../ui'
import { TextField } from '../today/TextField'

const MAX_SUGGESTIONS = 5

export interface ChosenProduct {
  name: string
  price: number
}

/**
 * What she is selling. There is no product table: the catalogue is whatever
 * she has sold before, and typing "38588" brings back the last price it went
 * out at. Anything the history does not know is created right here, because
 * leaving this screen mid-live means losing the sale.
 */
export function ProductStep({
  history,
  onChoose,
}: {
  history: readonly PastItem[]
  onChoose: (product: ChosenProduct) => void
}) {
  const [query, setQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')

  const suggestions = useMemo(
    () => productSuggestions([...history], query, MAX_SUGGESTIONS),
    [history, query],
  )
  const typed = query.trim()

  function openSheet() {
    setNewName(typed)
    setNewPrice('')
    setSheetOpen(true)
  }

  /** Enter takes the best guess; with nothing to guess it opens the new one. */
  function submit() {
    const best = suggestions[0]
    if (best) onChoose({ name: best.name, price: best.price })
    else if (typed !== '') openSheet()
  }

  function saveNew() {
    const name = newName.trim()
    if (name === '') return
    setSheetOpen(false)
    onChoose({ name, price: parsePrice(newPrice) })
  }

  return (
    <>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Producto o código"
        autoFocus
        onSubmit={submit}
      />

      <div className="mt-2 flex flex-col gap-2">
        {suggestions.map((suggestion) => (
          <Row
            key={suggestion.name}
            title={suggestion.name}
            subtitle={`${formatMoney(suggestion.price)} la última vez`}
            onClick={() => onChoose({ name: suggestion.name, price: suggestion.price })}
          />
        ))}
      </div>

      {typed !== '' && (
        <div className="mt-3">
          <BigButton floating={false} variant="quiet" icon={Plus} onClick={openSheet}>
            <span className="min-w-0 truncate">Crear {typed}</span>
          </BigButton>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Producto nuevo"
        footer={
          <BigButton floating={false} onClick={saveNew} disabled={newName.trim() === ''}>
            Listo
          </BigButton>
        }
      >
        <div className="flex flex-col gap-5 pb-2">
          <TextField
            label="Producto"
            value={newName}
            onChange={setNewName}
            placeholder="38588 Novage"
            autoFocus
          />
          <TextField
            label="Precio"
            value={newPrice}
            onChange={setNewPrice}
            inputMode="decimal"
            placeholder="12.90"
            onSubmit={saveNew}
          />
        </div>
      </Sheet>
    </>
  )
}

/** She types "12,90" as often as "12.90", and an empty price is a zero. */
function parsePrice(raw: string): number {
  const value = Number(raw.replace(',', '.').trim())
  return Number.isFinite(value) && value > 0 ? value : 0
}

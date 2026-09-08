import { Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { PastItem } from '../../domain'
import { productSuggestions } from '../../domain'
import { BigButton, Card, formatMoney, MoneyField, parseAmount, Row, SearchField, TextField } from '../../ui'

const MAX_SUGGESTIONS = 5

export interface ChosenProduct {
  name: string
  price: number
}

/**
 * What she is selling. There is no product table: the catalogue is whatever
 * she has sold before, and typing "38588" brings back the last price it went
 * out at.
 *
 * Anything the history does not know is created right here, in the same
 * scroll, never in a sheet on top of a sheet. And the price can be skipped:
 * a live is not the moment to look up what something costs, so the item goes
 * in at zero and shows up in red on the pedido until she fixes it. Making her
 * find the price mid-live is how a sale gets lost.
 */
export function ProductStep({
  history,
  onChoose,
}: {
  history: readonly PastItem[]
  onChoose: (product: ChosenProduct) => void
}) {
  const [query, setQuery] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')

  const suggestions = useMemo(
    () => productSuggestions([...history], query, MAX_SUGGESTIONS),
    [history, query],
  )
  const typed = query.trim()
  const typedPrice = parseAmount(newPrice) ?? 0
  const known = suggestions.some((entry) => entry.name.toLowerCase() === typed.toLowerCase())

  function openNew() {
    setNewName(typed)
    setNewPrice('')
    setNewOpen(true)
  }

  /** Enter takes the best guess. With nothing to guess, the price is inline. */
  function submit() {
    const best = suggestions[0]
    if (best) onChoose({ name: best.name, price: best.price })
  }

  function saveNew(price: number) {
    const name = newName.trim()
    if (name === '') return
    setNewOpen(false)
    onChoose({ name, price })
  }

  return (
    <>
      <h2 className="px-1 pt-5 pb-3 text-[1.375rem] font-semibold">¿Qué se lleva?</h2>

      {newOpen ? (
        /*
         * The search box goes away while this is open. Leaving it there meant
         * the same product name was typed on the screen twice, and it was not
         * obvious which of the two the app was going to keep.
         */
        <Card className="flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                label="Producto nuevo"
                value={newName}
                onChange={setNewName}
                placeholder="38588 Novage"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => setNewOpen(false)}
              aria-label="Cancelar"
              className="mt-7 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fill text-muted active:bg-brand-soft"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <MoneyField
            label="Precio"
            value={newPrice}
            onChange={setNewPrice}
            onSubmit={() => saveNew(typedPrice)}
          />

          {/*
            One button, not two. With the price empty, "Listo" and "todavía no
            sé el precio" did exactly the same thing, so the second one only
            asked her to choose between two identical outcomes.
          */}
          <BigButton
            floating={false}
            onClick={() => saveNew(typedPrice)}
            disabled={newName.trim() === ''}
          >
            {typedPrice > 0 ? 'Listo' : 'Anotar sin precio'}
          </BigButton>
        </Card>
      ) : (
        <>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Producto o código"
            autoFocus
            onSubmit={submit}
          />

          <div className="flex flex-col gap-2 pt-3">
            {suggestions.map((suggestion) => (
              <Row
                key={suggestion.name}
                title={suggestion.name}
                subtitle={
                  suggestion.price > 0
                    ? `${formatMoney(suggestion.price)} la última vez`
                    : 'sin precio todavía'
                }
                onClick={() => onChoose({ name: suggestion.name, price: suggestion.price })}
              />
            ))}

            {/*
              The history has nothing to offer, so there is nothing to choose
              between and no reason to ask her to confirm creating it. What she
              typed is the product; only the price is still missing.
            */}
            {typed !== '' && suggestions.length === 0 && (
              <Card className="flex flex-col gap-4">
                <span className="block text-xl leading-tight font-semibold">{typed}</span>
                <MoneyField
                  label="Precio"
                  value={newPrice}
                  onChange={setNewPrice}
                  onSubmit={() => onChoose({ name: typed, price: typedPrice })}
                />
                <BigButton
                  floating={false}
                  onClick={() => onChoose({ name: typed, price: typedPrice })}
                >
                  {typedPrice > 0 ? 'Listo' : 'Anotar sin precio'}
                </BigButton>
              </Card>
            )}

            {/* The history knows things, and none of them is this. Now it is a choice. */}
            {typed !== '' && suggestions.length > 0 && !known && (
              <BigButton floating={false} variant="quiet" icon={Plus} onClick={openNew}>
                <span className="min-w-0 truncate">Nuevo: {typed}</span>
              </BigButton>
            )}
          </div>
        </>
      )}
    </>
  )
}

/**
 * Agregar un producto a un pedido que ya existe.
 *
 * Same autocomplete as the live capture — the catalogue is whatever she has
 * sold before, and the price comes back with the name — but here she can stop
 * and set the quantity and the price before adding.
 */
import { useEffect, useMemo, useState } from 'react'
import type { CapturedItem } from '../../data/orders'
import { productLabel, productSuggestions, type PastItem } from '../../domain'
import { BigButton, Card, MoneyField, parseAmount, Row, SearchField, SectionHeader, Sheet, Stepper } from '../../ui'

const MAX_SUGGESTIONS = 6

export interface AddItemSheetProps {
  open: boolean
  onClose: () => void
  history: readonly PastItem[]
  onAdd: (item: CapturedItem) => void
}

export function AddItemSheet({ open, onClose, history, onAdd }: AddItemSheetProps) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!open) return
    setName('')
    setPrice('')
    setQuantity(1)
  }, [open])

  const suggestions = useMemo(
    () => productSuggestions([...history], name, MAX_SUGGESTIONS),
    [history, name],
  )

  const trimmed = name.trim()

  function add() {
    if (trimmed === '') return
    const parsed = parseAmount(price)
    // No price stays no price. Writing a zero here is what used to make an
    // order look settled while a line in it had never been priced.
    onAdd({ name: trimmed, quantity, ...(parsed === undefined || parsed <= 0 ? {} : { price: parsed }) })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Agregar producto"
      footer={
        <BigButton floating={false} disabled={trimmed === ''} onClick={add}>
          Agregar
        </BigButton>
      }
    >
      <div className="flex flex-col gap-3">
        <SearchField
          value={name}
          onChange={setName}
          placeholder="Producto o código"
          autoFocus
          onSubmit={add}
        />

        {suggestions.length > 0 && (
          <div className="flex flex-col gap-2">
            {suggestions.map((suggestion) => (
              <Row
                key={productLabel(suggestion)}
                title={productLabel(suggestion)}
                amount={suggestion.price}
                onClick={() => {
                  setName(productLabel(suggestion))
                  setPrice(suggestion.price === undefined ? '' : suggestion.price.toFixed(2))
                }}
              />
            ))}
          </div>
        )}

        <SectionHeader title="Cuánto" />
        <Card className="flex items-center justify-between gap-4">
          <span className="min-w-0 flex-1 truncate text-xl font-semibold">
            {trimmed === '' ? 'Cantidad' : trimmed}
          </span>
          <Stepper value={quantity} onChange={setQuantity} />
        </Card>
        <MoneyField label="Precio" value={price} onChange={setPrice} onSubmit={add} />
      </div>
    </Sheet>
  )
}

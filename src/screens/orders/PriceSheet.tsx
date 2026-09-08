/**
 * Poner o corregir el precio de una línea. A product captured during the live
 * often arrives without a price, and until it has one the total is a lie.
 */
import { useEffect, useState } from 'react'
import { BigButton, MoneyField, parseAmount, Sheet } from '../../ui'

export interface PriceSheetProps {
  open: boolean
  onClose: () => void
  name: string
  price: number
  onSave: (price: number) => void
}

export function PriceSheet({ open, onClose, name, price, onSave }: PriceSheetProps) {
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (open) setAmount(price > 0 ? price.toFixed(2) : '')
  }, [open, price])

  const value = parseAmount(amount)

  function save() {
    if (value === undefined) return
    onSave(value)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={name}
      footer={
        <BigButton floating={false} disabled={value === undefined} onClick={save}>
          Guardar
        </BigButton>
      }
    >
      <MoneyField label="Precio" value={amount} onChange={setAmount} autoFocus onSubmit={save} />
    </Sheet>
  )
}

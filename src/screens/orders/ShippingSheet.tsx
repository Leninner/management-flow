/**
 * Envío. Zero means she hands it over in Ambato; any amount means it ships,
 * and that amount is part of the total the customer owes.
 */
import { useEffect, useState } from 'react'
import { BigButton, MoneyField, parseAmount, Sheet } from '../../ui'

export interface ShippingSheetProps {
  open: boolean
  onClose: () => void
  cost: number
  onSave: (cost: number) => void
}

export function ShippingSheet({ open, onClose, cost, onSave }: ShippingSheetProps) {
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (open) setAmount(cost > 0 ? cost.toFixed(2) : '')
  }, [open, cost])

  const value = parseAmount(amount)

  function save() {
    if (value === undefined) return
    onSave(value)
    onClose()
  }

  function inAmbato() {
    onSave(0)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Envío"
      footer={
        <BigButton floating={false} disabled={value === undefined} onClick={save}>
          Guardar
        </BigButton>
      }
    >
      <div className="flex flex-col gap-3">
        <MoneyField
          label="Cuánto cuesta el envío"
          value={amount}
          onChange={setAmount}
          autoFocus
          onSubmit={save}
        />
        <BigButton floating={false} variant="quiet" onClick={inAmbato}>
          Entrega en Ambato
        </BigButton>
      </div>
    </Sheet>
  )
}

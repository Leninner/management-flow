/**
 * Registrar un abono. Paying in full is one tap on the main screen; this is
 * the sheet for everything else, including undoing an amount typed wrong,
 * which is the only way back once a payment is recorded.
 */
import { useEffect, useState } from 'react'
import { BigButton, Row, Sheet } from '../../ui'
import { AmountField, parseAmount } from './fields'

export interface PaymentSheetProps {
  open: boolean
  onClose: () => void
  balance: number
  paid: number
  onPay: (amount: number) => void
  onClear: () => void
}

export function PaymentSheet({ open, onClose, balance, paid, onPay, onClear }: PaymentSheetProps) {
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (open) setAmount('')
  }, [open])

  const value = parseAmount(amount)

  function save() {
    if (value === undefined || value <= 0) return
    onPay(value)
    onClose()
  }

  function clear() {
    onClear()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Abono"
      footer={
        <BigButton floating={false} disabled={value === undefined || value <= 0} onClick={save}>
          Guardar
        </BigButton>
      }
    >
      <div className="flex flex-col gap-3">
        <Row status={balance > 0 ? 'owes' : 'done'} title="Saldo" amount={balance} />
        <AmountField label="Abonó" value={amount} onChange={setAmount} autoFocus onSubmit={save} />
        {balance > 0 && (
          <BigButton floating={false} variant="quiet" onClick={() => setAmount(balance.toFixed(2))}>
            Todo el saldo
          </BigButton>
        )}
        {paid > 0 && (
          <BigButton floating={false} variant="quiet" onClick={clear}>
            Borrar lo abonado
          </BigButton>
        )}
      </div>
    </Sheet>
  )
}

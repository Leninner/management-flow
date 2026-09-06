/** Nombre, WhatsApp y dirección. Los alias se editan en la ficha. */
import { useEffect, useState } from 'react'
import type { Customer } from '../../db/types'
import { BigButton, Sheet } from '../../ui'
import { TextField } from '../orders/fields'

export interface EditCustomerSheetProps {
  open: boolean
  onClose: () => void
  customer: Customer
  onSave: (changes: { name: string; whatsapp: string; address: string }) => void
}

export function EditCustomerSheet({ open, onClose, customer, onSave }: EditCustomerSheetProps) {
  const [name, setName] = useState(customer.name)
  const [whatsapp, setWhatsapp] = useState(customer.whatsapp ?? '')
  const [address, setAddress] = useState(customer.address ?? '')

  useEffect(() => {
    if (!open) return
    setName(customer.name)
    setWhatsapp(customer.whatsapp ?? '')
    setAddress(customer.address ?? '')
  }, [open, customer])

  const trimmed = name.trim()

  function save() {
    if (trimmed === '') return
    onSave({ name: trimmed, whatsapp: whatsapp.trim(), address: address.trim() })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Datos"
      footer={
        <BigButton floating={false} disabled={trimmed === ''} onClick={save}>
          Guardar
        </BigButton>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Nombre" value={name} onChange={setName} autoFocus onSubmit={save} />
        <TextField
          label="WhatsApp"
          value={whatsapp}
          onChange={setWhatsapp}
          placeholder="0987654321"
          inputMode="tel"
          onSubmit={save}
        />
        <TextField
          label="Dirección"
          value={address}
          onChange={setAddress}
          placeholder="Calle, referencia"
          onSubmit={save}
        />
      </div>
    </Sheet>
  )
}

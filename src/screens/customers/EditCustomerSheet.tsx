/** Todo lo que identifica a una persona: nombre, alias, WhatsApp y dirección. */
import { useEffect, useState } from 'react'
import type { Customer } from '../../db/types'
import { normalizeText } from '../../domain'
import { BigButton, Sheet, TextField } from '../../ui'
import { AliasEditor } from './AliasEditor'

export interface EditCustomerSheetProps {
  open: boolean
  onClose: () => void
  customer: Customer
  onSave: (changes: {
    name: string
    whatsapp: string
    address: string
    aliases: string[]
  }) => void
}

export function EditCustomerSheet({ open, onClose, customer, onSave }: EditCustomerSheetProps) {
  const [name, setName] = useState(customer.name)
  const [whatsapp, setWhatsapp] = useState(customer.whatsapp ?? '')
  const [address, setAddress] = useState(customer.address ?? '')
  const [aliases, setAliases] = useState<string[]>(customer.aliases ?? [])

  useEffect(() => {
    if (!open) return
    setName(customer.name)
    setWhatsapp(customer.whatsapp ?? '')
    setAddress(customer.address ?? '')
    setAliases(customer.aliases ?? [])
  }, [open, customer])

  const trimmed = name.trim()

  /** An alias equal to the name, or to one already there, is not an alias. */
  function addAlias(alias: string) {
    const key = normalizeText(alias)
    if (key === '' || key === normalizeText(trimmed)) return
    if (aliases.some((existing) => normalizeText(existing) === key)) return
    setAliases([...aliases, alias])
  }

  function save() {
    if (trimmed === '') return
    onSave({ name: trimmed, whatsapp: whatsapp.trim(), address: address.trim(), aliases })
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
      <div className="flex flex-col gap-4">
        <TextField label="Nombre" value={name} onChange={setName} onSubmit={save} />
        <TextField
          label="WhatsApp"
          value={whatsapp}
          onChange={setWhatsapp}
          placeholder="0987654321"
          inputMode="tel"
          onSubmit={save}
        />
        <AliasEditor
          aliases={aliases}
          onAdd={addAlias}
          onRemove={(alias) => setAliases(aliases.filter((existing) => existing !== alias))}
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

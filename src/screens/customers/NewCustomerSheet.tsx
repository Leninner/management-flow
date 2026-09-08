/**
 * Crear un cliente. A name is enough; anything else can wait.
 *
 * While she types, whoever already matches shows up underneath, because the
 * duplicate is cheapest to avoid before it exists.
 */
import { useEffect, useState } from 'react'
import type { Customer } from '../../db/types'
import { matchesQuery } from '../../domain'
import { BigButton, Row, SectionHeader, Sheet, TextField } from '../../ui'

const MAX_MATCHES = 3
const MIN_QUERY = 2

export interface NewCustomerSheetProps {
  open: boolean
  onClose: () => void
  people: readonly Customer[]
  onCreate: (name: string, whatsapp: string) => void
  onPick: (customerId: string) => void
}

export function NewCustomerSheet({
  open,
  onClose,
  people,
  onCreate,
  onPick,
}: NewCustomerSheetProps) {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setWhatsapp('')
  }, [open])

  const trimmed = name.trim()
  const matches =
    trimmed.length >= MIN_QUERY
      ? people.filter((person) => matchesQuery(person, trimmed)).slice(0, MAX_MATCHES)
      : []

  function create() {
    if (trimmed === '') return
    onCreate(trimmed, whatsapp.trim())
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nuevo cliente"
      footer={
        <BigButton floating={false} disabled={trimmed === ''} onClick={create}>
          Crear
        </BigButton>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField
          label="Nombre"
          value={name}
          onChange={setName}
          placeholder="María Fernanda"
          autoFocus
          onSubmit={create}
        />
        <TextField
          label="WhatsApp"
          value={whatsapp}
          onChange={setWhatsapp}
          placeholder="0987654321"
          inputMode="tel"
          onSubmit={create}
        />

        {matches.length > 0 && (
          <>
            <SectionHeader title="Ya la tienes" />
            <div className="flex flex-col gap-2">
              {matches.map((person) => (
                <Row
                  key={person.id}
                  title={person.name}
                  subtitle={(person.aliases ?? []).join(' · ')}
                  onClick={() => {
                    onPick(person.id)
                    onClose()
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

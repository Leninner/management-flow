/**
 * Whoever is not on the strip.
 *
 * Picking stays the loud path and creating the quiet one: every time she
 * creates instead of picking, the same person ends up in the app twice and her
 * money gets split across two pedidos. But with nothing matching there is no
 * duplicate to make, so what she typed is offered as an ordinary row.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { customers } from '../../data'
import type { Customer } from '../../db/types'
import { Row, SearchField, Sheet } from '../../ui'

const MAX_RESULTS = 6

export function PersonSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (customer: Customer) => void
}) {
  const [query, setQuery] = useState('')
  const results = useLiveQuery(() => customers.search(query), [query], [] as Customer[])
  const name = query.trim()
  const known = results.some((entry) => entry.name.toLowerCase() === name.toLowerCase())

  async function create() {
    if (name === '') return
    const created = await customers.create({ name })
    setQuery('')
    onPick(created)
  }

  function choose(customer: Customer) {
    setQuery('')
    onPick(customer)
  }

  return (
    <Sheet open={open} onClose={onClose} title="¿Para quién?">
      <div className="flex flex-col gap-3">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Nombre, @usuario o celular"
          autoFocus
        />
        <div className="flex flex-col gap-2">
          {results.slice(0, MAX_RESULTS).map((customer) => (
            <Row key={customer.id} title={customer.name} onClick={() => choose(customer)} />
          ))}
          {name !== '' && !known && (
            <Row icon={UserPlus} title={`Crear "${name}"`} onClick={() => void create()} />
          )}
        </div>
      </div>
    </Sheet>
  )
}

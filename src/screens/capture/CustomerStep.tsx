import { useLiveQuery } from 'dexie-react-hooks'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { customers } from '../../data'
import type { Customer } from '../../db/types'
import { BigButton, Row, SearchField } from '../../ui'

/** Enough to pick from without turning the screen into a directory. */
const MAX_RESULTS = 6

/**
 * Who the order is for. Picking from the list is the loud path and creating is
 * the quiet one on purpose: every time she creates instead of picking, the
 * same person ends up in the app twice and her money gets split in two.
 */
export function CustomerStep({ onPick }: { onPick: (customer: Customer) => void }) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const results = useLiveQuery(() => customers.search(query), [query], [] as Customer[])
  const name = query.trim()

  async function create() {
    if (name === '' || creating) return
    setCreating(true)
    try {
      onPick(await customers.create({ name }))
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="pt-2">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Nombre, @usuario o celular"
          autoFocus
        />
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {results.slice(0, MAX_RESULTS).map((customer) => (
          <Row
            key={customer.id}
            title={customer.name}
            subtitle={secondaryIdentity(customer)}
            onClick={() => onPick(customer)}
          />
        ))}
      </div>

      {name !== '' && (
        <div className="mt-3">
          <BigButton floating={false} variant="quiet" icon={UserPlus} onClick={create} disabled={creating}>
            <span className="min-w-0 truncate">Crear a {name}</span>
          </BigButton>
        </div>
      )}
    </>
  )
}

/** The handle she knows her by, when it is not the name on the row. */
function secondaryIdentity(customer: Customer): string | undefined {
  const alias = customer.aliases[0]
  return alias ?? customer.whatsapp
}

import { useLiveQuery } from 'dexie-react-hooks'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { customers } from '../../data'
import type { Customer } from '../../db/types'
import { BigButton, Row, SearchField } from '../../ui'

/** Enough to pick from without turning the screen into a directory. */
const MAX_RESULTS = 6

export interface CustomerStepProps {
  /** Who she sold to last, newest first. The whole point is not typing. */
  recent: readonly Customer[]
  onPick: (customer: Customer) => void
}

/**
 * Who the order is for. Picking is the loud path and creating is the quiet
 * one on purpose: every time she creates instead of picking, the same person
 * ends up in the app twice and her money gets split in two.
 *
 * The row of faces is what makes a live survivable. During a live the same
 * eight people buy over and over, and typing a name with one hand while
 * talking to a camera is what she was losing sales to.
 */
export function CustomerStep({ recent, onPick }: CustomerStepProps) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const results = useLiveQuery(() => customers.search(query), [query], [] as Customer[])
  const name = query.trim()
  const known = results.some((customer) => customer.name.toLowerCase() === name.toLowerCase())

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
      <h2 className="px-1 pt-3 pb-3 text-[1.375rem] font-bold">¿Para quién?</h2>

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Nombre, @usuario o celular"
        autoFocus
      />

      {name === '' && recent.length > 0 && (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pt-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recent.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => onPick(customer)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            >
              <Avatar name={customer.name} size="lg" />
              <span className="w-16 truncate text-center text-[0.8125rem] font-semibold text-muted">
                {firstWord(customer.name)}
              </span>
            </button>
          ))}
        </div>
      )}

      {name !== '' && (
        <div className="flex flex-col gap-2 pt-3">
          {!known && (
            <BigButton floating={false} variant="quiet" icon={UserPlus} onClick={create} disabled={creating}>
              <span className="min-w-0 truncate">Crear a {name}</span>
            </BigButton>
          )}
          {results.slice(0, MAX_RESULTS).map((customer) => (
            <Row
              key={customer.id}
              title={customer.name}
              subtitle={secondaryIdentity(customer)}
              onClick={() => onPick(customer)}
            />
          ))}
        </div>
      )}
    </>
  )
}

/**
 * A letter in a circle. Cheaper to recognise mid-live than a name is to read,
 * and it never depends on a photo the app has no way to get.
 */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14 text-2xl' : 'h-11 w-11 text-xl'
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand ${box}`}
    >
      {initial(name)}
    </span>
  )
}

/** "@karlita" reads as K, not as @. */
function initial(name: string): string {
  const letter = name.replace(/[^\p{L}\p{N}]/gu, '').charAt(0)
  return letter === '' ? '?' : letter.toUpperCase()
}

function firstWord(name: string): string {
  return name.split(/\s+/)[0] ?? name
}

/** The handle she knows her by, when it is not the name on the row. */
function secondaryIdentity(customer: Customer): string | undefined {
  const alias = customer.aliases[0]
  return alias ?? customer.whatsapp
}

import { useLiveQuery } from 'dexie-react-hooks'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { customers } from '../../data'
import type { Customer } from '../../db/types'
import { Avatar, BigButton, Row, SearchField } from '../../ui'

/** Enough to pick from without turning the screen into a directory. */
const MAX_RESULTS = 6

/**
 * Who the order is for, which is not always somebody the app knows yet.
 *
 * A person she has never sold to is carried as a bare name until the item is
 * actually written down, so abandoning the screen leaves nothing behind.
 */
export interface ChosenCustomer {
  name: string
  /** Absent while the person exists only as the name she typed. */
  customer?: Customer
}

export interface CustomerStepProps {
  /** Who she sold to last, newest first. The whole point is not typing. */
  recent: readonly Customer[]
  onPick: (chosen: ChosenCustomer) => void
}

/**
 * Picking stays the loud path and creating the quiet one: every time she
 * creates instead of picking, the same person ends up in the app twice and her
 * money gets split across two orders.
 *
 * But that rule only earns its keep when there is something to tell apart.
 * With no match at all there is no duplicate to make, so the name she typed is
 * offered as an ordinary row and no button asks her to confirm a decision she
 * has already made. With matches, they come first and creating stays explicit.
 *
 * The row of faces is what makes a live survivable. During a live the same
 * eight people buy over and over, and typing a name with one hand while
 * talking to a camera is what she was losing sales to.
 */
export function CustomerStep({ recent, onPick }: CustomerStepProps) {
  const [query, setQuery] = useState('')

  const results = useLiveQuery(() => customers.search(query), [query], [] as Customer[])
  const name = query.trim()
  const known = results.some((customer) => customer.name.toLowerCase() === name.toLowerCase())
  const nothingMatches = name !== '' && results.length === 0

  return (
    <>
      <h2 className="px-1 pt-3 pb-3 text-[1.375rem] font-semibold">¿Para quién?</h2>

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Nombre, @usuario o celular"
        autoFocus
        onSubmit={() => {
          if (nothingMatches) onPick({ name })
        }}
      />

      {name === '' && recent.length > 0 && (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pt-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recent.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => onPick({ name: customer.name, customer })}
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
          {results.slice(0, MAX_RESULTS).map((customer) => (
            <Row
              key={customer.id}
              title={customer.name}
              subtitle={secondaryIdentity(customer)}
              onClick={() => onPick({ name: customer.name, customer })}
            />
          ))}

          {/*
            Nothing to tell apart: the name reads as an ordinary row, exactly
            like picking somebody, instead of a button that asks her to agree
            to create a record she never asked about.
          */}
          {nothingMatches && <Row title={name} onClick={() => onPick({ name })} />}

          {/* Matches exist, and none of them is her. Now creating is a real choice. */}
          {results.length > 0 && !known && (
            <BigButton floating={false} variant="quiet" icon={UserPlus} onClick={() => onPick({ name })}>
              <span className="min-w-0 truncate">Crear a {name}</span>
            </BigButton>
          )}
        </div>
      )}
    </>
  )
}


function firstWord(name: string): string {
  return name.split(/\s+/)[0] ?? name
}

/** The handle she knows her by, when it is not the name on the row. */
function secondaryIdentity(customer: Customer): string | undefined {
  const alias = customer.aliases[0]
  return alias ?? customer.whatsapp
}

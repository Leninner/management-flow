/**
 * Clientes.
 *
 * One search field over name, aliases and whatsapp: "maria" finds @maria23 and
 * "0987" finds the phone. Every row says what that person owes, because that
 * is the only thing about a customer that can be lost.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { UserPlus, Users, UserX } from 'lucide-react'
import { useState } from 'react'
import { customers as customerRepo, orders as orderRepo } from '../data'
import type { Customer, Order } from '../db/types'
import { BigButton, EmptyState, Row, SearchField, useNavigation } from '../ui'
import { NewCustomerSheet } from './customers/NewCustomerSheet'
import { owedBy } from './orders/filters'

/**
 * The phone usually lives in `whatsapp` AND as an alias, since adding it as an
 * alias is how a TikTok handle gets joined to a WhatsApp number. Printing both
 * showed the same number twice.
 */
function contactLine(customer: Customer): string {
  const seen = [...(customer.aliases ?? []), customer.whatsapp].filter(
    (value): value is string => Boolean(value),
  )
  return [...new Set(seen)].join(' · ')
}

export function Customers() {
  const { push } = useNavigation()
  const [query, setQuery] = useState('')
  const [newOpen, setNewOpen] = useState(false)

  const data = useLiveQuery(async () => {
    const [matches, everyone, allOrders] = await Promise.all([
      customerRepo.search(query),
      customerRepo.list(),
      orderRepo.listAll(),
    ])
    return { matches, everyone, allOrders }
  }, [query])

  async function create(name: string, whatsapp: string) {
    const customer = await customerRepo.create({ name, ...(whatsapp ? { whatsapp } : {}) })
    push({ kind: 'customerDetail', customerId: customer.id })
  }

  const byCustomer = new Map<string, Order[]>()
  for (const order of data?.allOrders ?? []) {
    const bucket = byCustomer.get(order.customerId)
    if (bucket) bucket.push(order)
    else byCustomer.set(order.customerId, [order])
  }

  return (
    <>
      <div className="pt-4">
        <SearchField value={query} onChange={setQuery} placeholder="Nombre, @usuario o celular" />
      </div>

      {data && data.matches.length === 0 && (
        <EmptyState
          icon={data.everyone.length === 0 ? Users : UserX}
          line={data.everyone.length === 0 ? 'Todavía no hay clientes' : 'No encontré a nadie'}
        />
      )}

      <div className="flex flex-col gap-2 pt-4">
        {data?.matches.map((customer) => {
          const owed = owedBy(byCustomer.get(customer.id) ?? [])
          return (
            <Row
              key={customer.id}
              status={owed > 0 ? 'owes' : undefined}
              title={customer.name}
              subtitle={contactLine(customer)}
              amount={owed > 0 ? owed : undefined}
              onClick={() => push({ kind: 'customerDetail', customerId: customer.id })}
            />
          )
        })}
      </div>

      <BigButton icon={UserPlus} onClick={() => setNewOpen(true)}>
        Nuevo cliente
      </BigButton>

      <NewCustomerSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        people={data?.everyone ?? []}
        onCreate={(name, whatsapp) => void create(name, whatsapp)}
        onPick={(customerId) => push({ kind: 'customerDetail', customerId })}
      />
    </>
  )
}

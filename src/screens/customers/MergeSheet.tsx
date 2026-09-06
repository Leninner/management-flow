/**
 * Fusionar dos clientes.
 *
 * Duplicates happen however good the search is, so the fix has to be visible
 * before it runs: who stays, who goes, which aliases end up together and how
 * many orders move or get combined. The plan on screen is the very same
 * function the repository applies, so what she reads is what happens.
 */
import { Merge, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Customer, Order } from '../../db/types'
import { matchesQuery, mergeCustomers } from '../../domain'
import { BigButton, Card, Row, SearchField, SectionHeader, Sheet } from '../../ui'

const MAX_CANDIDATES = 8

export interface MergeSheetProps {
  open: boolean
  onClose: () => void
  /** The customer whose card this is. She keeps her id, so the screen stays. */
  target: Customer
  people: readonly Customer[]
  orders: readonly Order[]
  onMerge: (sourceId: string) => void
}

export function MergeSheet({ open, onClose, target, people, orders, onMerge }: MergeSheetProps) {
  const [query, setQuery] = useState('')
  const [sourceId, setSourceId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSourceId(undefined)
  }, [open])

  const source = people.find((person) => person.id === sourceId)

  const candidates = people
    .filter((person) => person.id !== target.id && matchesQuery(person, query))
    .slice(0, MAX_CANDIDATES)

  const involved = source
    ? orders.filter((order) => order.customerId === target.id || order.customerId === source.id)
    : []
  const plan = source ? mergeCustomers(target, source, involved) : undefined
  const combined = plan?.removedOrderIds.length ?? 0
  const moved = source
    ? orders.filter((order) => order.customerId === source.id).length - combined
    : 0

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Fusionar"
      footer={
        <BigButton
          floating={false}
          disabled={!source}
          onClick={() => {
            if (!source) return
            onMerge(source.id)
            onClose()
          }}
        >
          Sí, fusionar
        </BigButton>
      }
    >
      {!source ? (
        <div className="flex flex-col gap-3">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="¿Con quién es la misma persona?"
          />
          <div className="flex flex-col gap-2">
            {candidates.map((person) => (
              <Row
                key={person.id}
                title={person.name}
                subtitle={[...(person.aliases ?? []), person.whatsapp].filter(Boolean).join(' · ')}
                onClick={() => setSourceId(person.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <SectionHeader title="Queda" />
          <Row
            title={plan?.customer.name ?? target.name}
            subtitle={[plan?.customer.whatsapp, plan?.customer.address].filter(Boolean).join(' · ')}
          />

          <SectionHeader title="Se va" />
          <Row title={source.name} subtitle={(source.aliases ?? []).join(' · ')} />

          {plan && plan.customer.aliases.length > 0 && (
            <>
              <SectionHeader title="Alias" />
              <Card className="flex flex-wrap gap-2">
                {plan.customer.aliases.map((alias) => (
                  <span
                    key={alias}
                    className="flex min-h-9 items-center rounded-full bg-brand-soft px-3 text-[1.0625rem] font-semibold text-brand"
                  >
                    {alias}
                  </span>
                ))}
              </Card>
            </>
          )}

          <SectionHeader title="Pedidos" />
          <Row icon={ShoppingBag} title="Pasan" count={moved} />
          {combined > 0 && <Row icon={Merge} title="Se juntan" count={combined} />}

          <div className="pt-4">
            <BigButton floating={false} variant="quiet" onClick={() => setSourceId(undefined)}>
              Elegir otro
            </BigButton>
          </div>
        </div>
      )}
    </Sheet>
  )
}

/**
 * Pedidos.
 *
 * One list, four filters, and the same reading in every row: colour for the
 * state, name to know who, amount to know how much. Orders from closed
 * campaigns stay in the list — that debt is exactly the money this business
 * loses — and carry the campaign name so she knows it is an old one.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCheck, Package, PackageCheck, ShoppingBag, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { campaigns as campaignRepo, customers as customerRepo, orders as orderRepo } from '../data'
import type { Campaign, Order } from '../db/types'
import { orderBalance } from '../domain'
import { BigButton, EmptyState, Money, Row, SectionHeader, useNavigation } from '../ui'
import { FilterTiles } from './orders/FilterTiles'
import {
  countByFilter,
  filterOrders,
  orderStatus,
  ORDER_FILTERS,
  owedBy,
  type OrderFilter,
} from './orders/filters'
import { orderStateLine, todayIso } from './orders/format'

export type { OrderFilter } from './orders/filters'

export interface OrdersProps {
  /** Preselected from Hoy, where she taps straight into "por cobrar". */
  initialFilter?: OrderFilter
}

const EMPTY: Record<OrderFilter, { icon: LucideIcon; line: string }> = {
  unconfirmed: { icon: PackageCheck, line: 'Nada sin confirmar' },
  toCollect: { icon: CheckCheck, line: 'Nadie te debe' },
  toDeliver: { icon: Truck, line: 'Nada por entregar' },
  done: { icon: ShoppingBag, line: 'Todavía nada completo' },
}

export function Orders({ initialFilter }: OrdersProps) {
  const { push } = useNavigation()
  const [filter, setFilter] = useState<OrderFilter>(initialFilter ?? 'unconfirmed')
  const [seed, setSeed] = useState(initialFilter)

  // Hoy pushes a filter into an already mounted tab; adopt it without an effect.
  if (initialFilter !== seed) {
    setSeed(initialFilter)
    if (initialFilter) setFilter(initialFilter)
  }

  const data = useLiveQuery(async () => {
    const [all, people, campaignList, active] = await Promise.all([
      orderRepo.listAll(),
      customerRepo.list(),
      campaignRepo.list(),
      campaignRepo.getActive(),
    ])
    return { all, people, campaignList, active }
  }, [])

  if (!data) return null

  const names = new Map(data.people.map((customer) => [customer.id, customer.name]))
  const campaignById = new Map(data.campaignList.map((campaign) => [campaign.id, campaign]))
  const counts = countByFilter(data.all)
  const rows = filterOrders(data.all, filter)
  const owed = owedBy(rows)
  const today = todayIso()
  const label = ORDER_FILTERS.find((option) => option.key === filter)?.label ?? ''
  const empty =
    data.all.length === 0 ? { icon: ShoppingBag, line: 'Todavía no hay pedidos' } : EMPTY[filter]

  return (
    <>
      <FilterTiles value={filter} counts={counts} onChange={setFilter} />

      {rows.length === 0 ? (
        <EmptyState icon={empty.icon} line={empty.line} />
      ) : (
        <>
          <SectionHeader
            title={label}
            action={owed > 0 ? <Money value={owed} size="lg" tone="owes" /> : undefined}
          />
          <div className="flex flex-col gap-2">
            {rows.map((order) => (
              <Row
                key={order.id}
                status={orderStatus(order)}
                title={names.get(order.customerId) ?? 'Sin nombre'}
                subtitle={subtitleFor(order, campaignById.get(order.campaignId), data.active, today)}
                amount={orderBalance(order)}
                onClick={() => push({ kind: 'orderDetail', orderId: order.id })}
              />
            ))}
          </div>
        </>
      )}

      <BigButton icon={Package} onClick={() => push({ kind: 'capture' })}>
        Capturar pedido
      </BigButton>
    </>
  )
}

/** One short line. The state in words, and the campaign only when it is old. */
function subtitleFor(
  order: Order,
  campaign: Campaign | undefined,
  active: Campaign | undefined,
  today: string,
): string {
  const old = campaign && campaign.id !== active?.id ? campaign.name : undefined
  return [old, orderStateLine(order, today)].filter(Boolean).join(' · ')
}

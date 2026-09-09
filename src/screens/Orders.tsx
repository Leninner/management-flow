/**
 * Pedidos.
 *
 * One number, three views, one list. The number is what she is owed across
 * every campaign, because a saldo from the last catalogue is exactly the money
 * this business loses; the rows carry the campaign name when it is an old one.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCheck, Plus, ShoppingBag, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { campaigns as campaignRepo, customers as customerRepo, orders as orderRepo } from '../data'
import type { Campaign, Order } from '../db/types'
import { orderBalance } from '../domain'
import { BigButton, Card, cx, EmptyState, Money, useNavigation } from '../ui'
import {
  countByFilter,
  filterOrders,
  orderStatus,
  ORDER_FILTERS,
  owedBy,
  type OrderFilter,
} from './orders/filters'
import { orderStateLine, todayIso } from './orders/format'
import { FirstRun } from './FirstRun'

export type { OrderFilter } from './orders/filters'

export interface OrdersProps {
  /** Preselected by whoever sent her here, so the list matches what she tapped. */
  initialFilter?: OrderFilter
}

const EMPTY: Record<OrderFilter, { icon: LucideIcon; line: string }> = {
  toCollect: { icon: CheckCheck, line: 'Nadie te debe' },
  toDeliver: { icon: Truck, line: 'Nada por entregar' },
  done: { icon: ShoppingBag, line: 'Todavía nada completo' },
}

export function Orders({ initialFilter }: OrdersProps) {
  const { push } = useNavigation()
  const [filter, setFilter] = useState<OrderFilter>(initialFilter ?? 'toCollect')

  const data = useLiveQuery(async () => {
    const [all, people, campaignList] = await Promise.all([
      orderRepo.listAll(),
      customerRepo.list(),
      campaignRepo.list(),
    ])
    return { all, people, campaignList }
  }, [])

  if (!data) return null
  // Nothing to collect and nowhere to write until a campaign is open. Two
  // fields is the whole setup; asking for more is why she never opens it again.
  if (!data.campaignList.some((campaign) => campaign.active)) return <FirstRun />

  const names = new Map(data.people.map((customer) => [customer.id, customer.name]))
  const campaignById = new Map<string, Campaign>(
    data.campaignList.map((campaign) => [campaign.id, campaign]),
  )
  const counts = countByFilter(data.all)
  const rows = filterOrders(data.all, filter)
  const today = todayIso()
  const empty = data.all.length === 0 ? { icon: ShoppingBag, line: 'Todavía no hay pedidos' } : EMPTY[filter]

  return (
    <>
      <div className="px-1 pt-2 pb-5">
        <span className="block text-[0.9375rem] text-faint">Te deben</span>
        <Money
          value={owedBy(data.all)}
          size="xl"
          tone="owes"
          className="mt-2 block text-[3rem]"
        />
      </div>

      {/* Three words, not three filled pills: the list below is the loud thing. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3.5">
        {ORDER_FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-current={option.key === filter ? 'true' : undefined}
            onClick={() => setFilter(option.key)}
            className={cx(
              'flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[1rem]',
              option.key === filter ? 'bg-card font-bold shadow-sheet' : 'font-medium text-faint',
            )}
          >
            {option.label}
            {counts[option.key] > 0 && (
              <span className="money tabular-nums opacity-60">{counts[option.key]}</span>
            )}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={empty.icon} line={empty.line} />
      ) : (
        <Card padded={false}>
          {rows.map((order) => (
            <PersonRow
              key={order.id}
              order={order}
              name={names.get(order.customerId) ?? 'Sin nombre'}
              campaign={campaignById.get(order.campaignId)}
              today={today}
              onOpen={() => push({ kind: 'orderDetail', orderId: order.id })}
            />
          ))}
        </Card>
      )}
      {/* The one action of the tab. */}
      <BigButton icon={Plus} onClick={() => push({ kind: 'newOrder' })}>
        Agregar pedido
      </BigButton>
    </>
  )
}

function PersonRow({
  order,
  name,
  campaign,
  today,
  onOpen,
}: {
  order: Order
  name: string
  campaign: Campaign | undefined
  today: string
  onOpen: () => void
}) {
  const status = orderStatus(order)
  // The campaign only earns a mention when it is not the open one: on the row
  // of somebody who owes from this catalogue it is noise she reads every time.
  const line = campaign?.active
    ? orderStateLine(order, today)
    : `${campaign?.name ?? ''} · ${orderStateLine(order, today)}`

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-[3.75rem] w-full items-center gap-3 border-b border-line px-[1.125rem] py-2.5 text-left last:border-b-0 active:bg-brand-soft"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate leading-snug font-medium">{name}</span>
        <span className="mt-0.5 block truncate text-[0.875rem] text-muted">{line}</span>
      </span>
      <Money value={orderBalance(order)} size="lg" tone={status} className="shrink-0 text-[1.1875rem]" />
    </button>
  )
}

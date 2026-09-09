/**
 * ¿Cuánto te costó?
 *
 * One number she writes: what Oriflame charged for the whole pedido, which is
 * what her card was charged. Everything else on this screen is a subtraction
 * from it. There is no cost per product, because she does not know one until
 * she is paying and asking her to type twenty of them is asking her not to.
 *
 * Until that number exists, "Ganas" is not drawn at all. Inventing it with a
 * percentage produces a figure she would buy the next catalogue against.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { campaigns, orders } from '../data'
import type { Campaign, Order } from '../db/types'
import { campaignProfitCents, campaignSoldCents, collectedCents, fromCents, orderBalanceCents } from '../domain'
import { Card, EmptyState, Money, SectionHeader, cx, formatMoney } from '../ui'
import { SupplierInvoiceSheet } from './costs/SupplierInvoiceSheet'

export function Costs() {
  const [editing, setEditing] = useState(false)

  const data = useLiveQuery(async () => {
    const [campaignList, orderList] = await Promise.all([campaigns.list(), orders.listAll()])
    return { campaignList, orderList }
  }, [])

  if (!data) return null
  const campaign = data.campaignList.find((entry) => entry.active)
  if (!campaign) return <EmptyState icon={CalendarDays} line="No hay una campaña abierta" />

  const invoice = campaign.supplierInvoiceAmount
  const soldCents = campaignSoldCents(data.orderList, campaign.id)
  const profitCents = campaignProfitCents(data.orderList, campaign)

  const past = data.campaignList
    .filter((entry) => entry.id !== campaign.id)
    .sort((a, b) => b.cutoffDate.localeCompare(a.cutoffDate) || b.id.localeCompare(a.id))

  return (
    <>
      <div className="px-1 pt-1 pb-5">
        <h2 className="text-[1.75rem] leading-tight font-bold tracking-tight">¿Cuánto te costó?</h2>
        <span className="mt-2 block text-[0.9375rem] text-faint">
          Lo que Oriflame te cobró por todo el pedido
        </span>
      </div>

      <Card>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cx(
            'money flex h-[4.5rem] w-full items-center rounded-field bg-fill px-5 text-left',
            'text-[2.125rem] font-bold tracking-tight tabular-nums active:bg-brand-soft',
            invoice === undefined && 'text-muted',
          )}
        >
          {invoice === undefined ? 'Escríbelo' : formatMoney(invoice)}
        </button>

        <div className="flex items-baseline justify-between gap-3 pt-5 pb-4">
          <span className="text-[0.9375rem] text-muted">Les cobras a tus clientes</span>
          <span className="money text-[1.0625rem] font-semibold tabular-nums">
            {formatMoney(fromCents(soldCents))}
          </span>
        </div>

        {profitCents !== undefined && (
          <div className="border-t border-ink pt-4">
            <span className="block text-[0.9375rem] text-muted">Ganas</span>
            <Money
              value={fromCents(profitCents)}
              size="xl"
              tone={profitCents < 0 ? 'owes' : 'done'}
              className="mt-1.5 block text-[2.75rem]"
            />
          </div>
        )}
      </Card>

      {past.length > 0 && (
        <>
          <SectionHeader title="Anteriores" />
          <Card padded={false}>
            {past.map((entry) => (
              <PastRow key={entry.id} campaign={entry} orders={data.orderList} />
            ))}
          </Card>
        </>
      )}

      <SupplierInvoiceSheet open={editing} onClose={() => setEditing(false)} campaign={campaign} />
    </>
  )
}

/**
 * A closed campaign in one line. The saldo still out there rides beside the
 * profit: a campaign that earned well and was never collected is exactly the
 * case this business loses sight of.
 */
function PastRow({ campaign, orders }: { campaign: Campaign; orders: readonly Order[] }) {
  const theirs = orders.filter((order) => order.campaignId === campaign.id)
  const profitCents = campaignProfitCents(theirs, campaign)
  const owed = theirs.reduce((cents, order) => {
    const balance = orderBalanceCents(order)
    return balance > 0 ? cents + balance : cents
  }, 0)

  const paid = campaign.supplierInvoiceAmount
  const subtitle = [
    paid === undefined ? undefined : `pagaste ${formatMoney(paid)}`,
    `cobraste ${formatMoney(fromCents(collectedCents(theirs)))}`,
    owed > 0 ? `falta ${formatMoney(fromCents(owed))}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex min-h-[3.75rem] items-center gap-3 border-b border-line px-[1.125rem] py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate leading-snug font-medium">{campaign.name}</span>
        <span className="money mt-0.5 block truncate text-[0.875rem] text-muted tabular-nums">
          {subtitle}
        </span>
      </span>
      {profitCents !== undefined && (
        <Money
          value={fromCents(profitCents)}
          size="lg"
          tone={profitCents < 0 ? 'owes' : 'done'}
          className="shrink-0 text-[1.1875rem]"
        />
      )}
    </div>
  )
}

/**
 * Agregar pedido: the screen where a pedido gets written.
 *
 * The pedido is drawn as a sheet that gets filled in, and the row above the tab
 * bar is the line being written, shaped like the line it will become. One tap
 * per product: there is no button that confirms a product, and no step between
 * choosing the person and writing what she is taking.
 *
 * Picking a person changes the shape of the screen — the strip closes onto her
 * name and the sheet is titled with it — because the old version left the grid
 * of faces exactly where it was and nothing said the tap had landed.
 *
 * It opens from Pedidos and closes again rather than living on a tab: the same
 * sheet on a tab was the pedido drawn twice, once here to write it and once in
 * Pedidos to collect it. Here she writes; there she settles.
 *
 * The strip is what makes a live survivable: during one, the same eight people
 * buy over and over, and switching between them has to cost one tap without
 * leaving the screen.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { campaigns, customers as customerRepo, orders } from '../data'
import type { Customer, Order } from '../db/types'
import { fromCents, missingPriceCount, orderSubtotalCents } from '../domain'
import { cx } from '../ui'
import { AddLine, useCatalogue } from './orders/AddLine'
import { InvoiceLines, InvoiceSheet, InvoiceTotals } from './orders/Invoice'
import { PersonSheet } from './newOrder/PersonSheet'

/** How many names fit on the strip without it turning into a directory. */
const RECENT = 8

export function NewOrder() {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [draft, setDraft] = useState<{ code?: string; name: string }>({ name: '' })

  const data = useLiveQuery(async () => {
    const campaign = await campaigns.getActive()
    const [orderList, customerList] = await Promise.all([orders.listAll(), customerRepo.list()])
    return { campaign, orderList, customerList }
  }, [])

  const orderList = data?.orderList
  const customerList = data?.customerList

  // Who she sold to last, newest first. Recency beats alphabetical: the people
  // buying in this live are the people who bought in the last one.
  const recent = useMemo<Customer[]>(() => {
    const byId = new Map((customerList ?? []).map((entry) => [entry.id, entry]))
    const seen = new Set<string>()
    const list: Customer[] = []
    for (const order of [...(orderList ?? [])].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )) {
      if (seen.has(order.customerId)) continue
      seen.add(order.customerId)
      const found = byId.get(order.customerId)
      if (found) list.push(found)
      if (list.length === RECENT) break
    }
    // A brand new install has no orders to rank, so fall back to whoever exists.
    if (list.length === 0) return (customerList ?? []).slice(0, RECENT)
    return list
  }, [orderList, customerList])

  const campaign = data?.campaign
  const catalogue = useCatalogue(campaign?.id ?? '')

  if (!data) return null
  if (!campaign) return null
  // Narrowed once, so the writers below do not each have to re-prove it.
  const active = campaign

  const picked =
    data.customerList.find((entry) => entry.id === pickedId) ?? recent[0] ?? undefined

  // One pedido per customer per campaign, so there is at most one of these.
  const open: Order | undefined = picked
    ? data.orderList.find(
        (order) => order.campaignId === active.id && order.customerId === picked.id,
      )
    : undefined

  const items = open?.items ?? []
  const missing = missingPriceCount({ items })

  async function drop(index: number) {
    if (!open) return
    const left = await orders.removeItem(open.id, index)
    // A pedido with nothing in it is not a pedido, it is noise on every other
    // screen. A cancelled one gets deleted.
    if (left.items.length === 0 && left.paidAmount === 0) await orders.remove(open.id)
  }

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-1 pb-3.5">
        {recent.map((customer) => (
          <button
            key={customer.id}
            type="button"
            onClick={() => setPickedId(customer.id)}
            className={cx(
              'h-10 shrink-0 rounded-full px-4 text-[1rem]',
              customer.id === picked?.id
                ? 'bg-card font-bold shadow-sheet'
                : 'font-medium text-faint',
            )}
          >
            {firstName(customer.name)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label="Buscar o crear una clienta"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-faint active:bg-card"
        >
          <UserPlus size={20} aria-hidden="true" />
        </button>
      </div>

      {picked ? (
        <InvoiceSheet title={picked.name} subtitle={active.name}>
          <InvoiceLines items={items} onRemove={(index) => void drop(index)} />
          <InvoiceTotals
            label="Total"
            value={fromCents(orderSubtotalCents({ items }))}
            note={missing > 0 ? plural(missing) : undefined}
          />
        </InvoiceSheet>
      ) : (
        <InvoiceSheet title="¿Para quién?">
          <InvoiceLines items={[]} emptyLine="Toca el + para elegir a la clienta" />
        </InvoiceSheet>
      )}

      {picked && (
        <AddLine
          campaignId={active.id}
          customerId={picked.id}
          catalogue={catalogue}
          draft={draft}
          onDraft={setDraft}
        />
      )}

      <PersonSheet
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(customer) => {
          setPickedId(customer.id)
          setPicking(false)
        }}
      />
    </>
  )
}

/** What she would type in WhatsApp, not what is on the ID card. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

function plural(count: number): string {
  return count === 1 ? 'Falta 1 precio' : `Faltan ${count} precios`
}


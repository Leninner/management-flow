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
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { campaignProducts, campaigns, customers as customerRepo, orders } from '../data'
import type { CampaignProduct, Customer, Order } from '../db/types'
import { fromCents, missingPriceCount, orderSubtotalCents } from '../domain'
import { cx, useActionSlot } from '../ui'
import { Composer, type ComposedLine } from './newOrder/Composer'
import { PersonSheet } from './newOrder/PersonSheet'
import { InvoiceLines, InvoiceSheet, InvoiceTotals, ProductLabel } from './orders/Invoice'

/** How many names fit on the strip without it turning into a directory. */
const RECENT = 8

interface Catalogue {
  code: string
  name: string
  price?: number
}

export function NewOrder() {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [draft, setDraft] = useState<{ code?: string; name: string }>({ name: '' })

  const data = useLiveQuery(async () => {
    const campaign = await campaigns.getActive()
    const [orderList, customerList, products] = await Promise.all([
      orders.listAll(),
      customerRepo.list(),
      campaign ? campaignProducts.listByCampaign(campaign.id) : Promise.resolve([]),
    ])
    return { campaign, orderList, customerList, products }
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

  /**
   * This campaign's prices win, and anything only the history knows comes in
   * without one: prices change between catalogues, so last month's number is a
   * suggestion to confirm rather than a value to fill in.
   */
  const catalogue = useMemo<Catalogue[]>(() => {
    const byCode = new Map<string, Catalogue>()
    for (const order of orderList ?? []) {
      for (const item of order.items) {
        if (!item.code || byCode.has(item.code)) continue
        byCode.set(item.code, { code: item.code, name: item.name })
      }
    }
    for (const product of (data?.products ?? []) as CampaignProduct[]) {
      byCode.set(product.code, {
        code: product.code,
        name: product.name,
        ...(product.price === undefined ? {} : { price: product.price }),
      })
    }
    return [...byCode.values()]
  }, [orderList, data?.products])

  const slot = useActionSlot()
  /**
   * Claiming the shell's action slot is not bookkeeping: unclaimed, the slot
   * keeps `pointer-events-none` so nothing portalled into it can be tapped at
   * all. The composer looked perfectly normal and did nothing. Claiming it also
   * reserves the room so the sheet never ends up behind the composer.
   */
  useEffect(() => slot?.claim(), [slot])

  const campaign = data?.campaign

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

  async function write(line: ComposedLine) {
    if (!picked) return
    await orders.addItem({
      campaignId: active.id,
      customerId: picked.id,
      item: { ...(line.code ? { code: line.code } : {}), name: line.name, ...(line.price === undefined ? {} : { price: line.price }) },
    })
  }

  async function drop(index: number) {
    if (!open) return
    const left = await orders.removeItem(open.id, index)
    // A pedido with nothing in it is not a pedido, it is noise on every other
    // screen. A cancelled one gets deleted.
    if (left.items.length === 0 && left.paidAmount === 0) await orders.remove(open.id)
  }

  const suggestions = suggest(catalogue, draft)

  const composer = (
    <div className="flex flex-col gap-2.5">
      {suggestions.length > 0 && (
        <div className="overflow-hidden rounded-card bg-card shadow-sheet">
          {suggestions.map((hit) => (
            <button
              key={hit.code}
              type="button"
              onClick={() => void write(hit)}
              className="flex h-[3.375rem] w-full items-center justify-between gap-3 border-b border-line px-[1.125rem] text-left last:border-b-0 active:bg-brand-soft"
            >
              <span className="min-w-0 truncate">
                <ProductLabel item={hit} />
              </span>
              <span className="money shrink-0 text-[0.9375rem] text-muted tabular-nums">
                {hit.price === undefined ? 'sin precio' : `$${hit.price.toFixed(2)}`}
              </span>
            </button>
          ))}
        </div>
      )}
      <Composer
        priceFor={(code) => catalogue.find((entry) => entry.code === code)?.price}
        onChange={setDraft}
        onSubmit={(line) => void write(line)}
        fallbackName={suggestions[0]?.name}
      />
    </div>
  )

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

      {picked && slot?.node && createPortal(composer, slot.node)}

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

/**
 * With a code in hand there is exactly one product it can be, so the list
 * collapses to it. Without one it is an ordinary search over what she has sold.
 */
function suggest(catalogue: readonly Catalogue[], draft: { code?: string; name: string }): Catalogue[] {
  const typed = draft.name.trim()
  if (draft.code !== undefined) {
    const known = catalogue.find((entry) => entry.code === draft.code)
    if (typed !== '') {
      return [{ code: draft.code, name: typed, ...(known?.price === undefined ? {} : { price: known.price }) }]
    }
    return known ? [known] : []
  }
  if (typed === '') return []
  const needle = typed.toLowerCase()
  return catalogue
    .filter((entry) => `${entry.code} ${entry.name}`.toLowerCase().includes(needle))
    .slice(0, 3)
}


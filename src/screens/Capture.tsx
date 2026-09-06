import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Check, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { campaigns, customers as customerRepo, orders } from '../data'
import type { Campaign, Customer, Order } from '../db/types'
import type { PastItem } from '../domain'
import { normalizeName } from '../domain'
import {
  BigButton,
  Card,
  EmptyState,
  formatMoney,
  SectionHeader,
  Stepper,
  useNavigation,
} from '../ui'
import { CapturedList, type CaptureEntry } from './capture/CapturedList'
import { Avatar, CustomerStep } from './capture/CustomerStep'
import { ProductStep, type ChosenProduct } from './capture/ProductStep'
import { firstName } from './today/format'

/** How many faces fit on the recent row without it turning into a directory. */
const RECENT = 8

interface CaptureData {
  campaign: Campaign | undefined
  orderList: Order[]
  customerList: Customer[]
}

/**
 * Live capture.
 *
 * The rule that governs this screen: during a live only WHAT and WHO get
 * written down. No money, no address, no delivery, no payment. All of that is
 * marked afterwards from another screen. A payment field here is what makes
 * her freeze in front of the camera.
 *
 * It is one screen, not a wizard. Who, what, how many and the button all live
 * in the same scroll, and nothing she can pick opens a sheet on top of it.
 */
export function Capture() {
  const { go } = useNavigation()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [product, setProduct] = useState<ChosenProduct | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [captures, setCaptures] = useState<CaptureEntry[]>([])
  const [saving, setSaving] = useState(false)

  const data = useLiveQuery<CaptureData>(async () => {
    const [campaign, orderList, customerList] = await Promise.all([
      campaigns.getActive(),
      orders.listAll(),
      customerRepo.list(),
    ])
    return { campaign, orderList, customerList }
  }, [])

  const orderList = data?.orderList
  // The catalogue that builds itself: every item ever sold, with the date of
  // the order it came from, is the whole autocomplete.
  const history = useMemo<PastItem[]>(() => {
    const past: PastItem[] = []
    for (const order of orderList ?? []) {
      for (const item of order.items) {
        past.push({ name: item.name, price: item.price, usedAt: order.createdAt })
      }
    }
    return past
  }, [orderList])

  // Who she sold to last, newest first. Recency beats alphabetical here: the
  // people buying in this live are the people who bought in the last one.
  const recent = useMemo<Customer[]>(() => {
    const byId = new Map((data?.customerList ?? []).map((entry) => [entry.id, entry]))
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
    return list
  }, [orderList, data?.customerList])

  const campaign = data?.campaign

  async function capture() {
    if (!campaign || !customer || !product || saving) return
    setSaving(true)
    try {
      // Never creates an order directly: one order per customer per campaign
      // is what keeps a single total, a single payment and a single freight.
      const order = await orders.addItem({
        campaignId: campaign.id,
        customerId: customer.id,
        item: { name: product.name, quantity, price: product.price },
      })
      const key = `${order.id}::${normalizeName(product.name)}`
      setCaptures((current) => {
        const previous = current.find((entry) => entry.key === key)
        return [
          {
            key,
            orderId: order.id,
            customerId: customer.id,
            customerName: customer.name,
            itemName: product.name,
            quantity: (previous?.quantity ?? 0) + quantity,
          },
          ...current.filter((entry) => entry.key !== key),
        ]
      })
      setProduct(null)
      setQuantity(1)
    } finally {
      setSaving(false)
    }
  }

  async function undo(entry: CaptureEntry) {
    const order = await orders.get(entry.orderId)
    const index =
      order?.items.findIndex((item) => normalizeName(item.name) === normalizeName(entry.itemName)) ??
      -1
    if (index >= 0) {
      const left = await orders.removeItem(entry.orderId, index)
      // An order with nothing left in it is not an order, it is noise on every
      // other screen. A cancelled order gets deleted.
      if (left.items.length === 0 && left.paidAmount === 0 && !left.confirmed) {
        await orders.remove(entry.orderId)
      }
    }
    setCaptures((current) => current.filter((item) => item.key !== entry.key))
  }

  function changeCustomer() {
    setCustomer(null)
    setProduct(null)
    setQuantity(1)
  }

  if (!data) return null

  if (!campaign) {
    return (
      <EmptyState
        icon={CalendarDays}
        line="Primero abre la campaña"
        actionLabel="Ir a Hoy"
        onAction={() => go('today')}
      />
    )
  }

  return (
    <>
      {!customer ? (
        <CustomerStep recent={recent} onPick={setCustomer} />
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3 rounded-full bg-card p-1.5 pl-2 shadow-card">
            <Avatar name={customer.name} />
            <span className="min-w-0 flex-1 truncate text-[1.1875rem] font-bold">
              {customer.name}
            </span>
            <button
              type="button"
              onClick={changeCustomer}
              aria-label="Cambiar de cliente"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-muted active:bg-brand-soft"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {!product ? (
            <ProductStep history={history} onChoose={setProduct} />
          ) : (
            <Card className="mt-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-xl leading-tight font-bold">{product.name}</span>
                  {product.price > 0 ? (
                    <span className="money mt-1.5 block text-[1.0625rem] font-bold text-brand">
                      {formatMoney(product.price)}
                    </span>
                  ) : (
                    <span className="mt-2 inline-flex items-center rounded-full bg-pending-soft px-3 py-1 text-[0.875rem] font-bold text-pending-ink">
                      Falta el precio
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setProduct(null)}
                  aria-label="Cambiar de producto"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-muted active:bg-brand-soft"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                <span className="text-[1.0625rem] font-semibold text-muted">Cantidad</span>
                <Stepper value={quantity} onChange={setQuantity} />
              </div>
            </Card>
          )}
        </>
      )}

      {captures.length > 0 && (
        <>
          <SectionHeader title="En este live" count={captures.length} />
          <CapturedList entries={captures} onRemove={undo} />
        </>
      )}

      {/*
        The one big button only exists once the product is picked, which is
        also the only moment the keyboard is down. While she is typing there is
        nothing pinned to the bottom of the screen to fight the keyboard for
        room, and the captured list stays where she can see it.
      */}
      {customer && product && (
        <BigButton icon={Check} onClick={capture} disabled={saving}>
          <span className="min-w-0 truncate">Anotar a {firstName(customer.name)}</span>
        </BigButton>
      )}
    </>
  )
}

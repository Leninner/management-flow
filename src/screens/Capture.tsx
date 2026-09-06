import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Check, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { campaigns, orders } from '../data'
import type { Campaign, Customer, Order } from '../db/types'
import type { PastItem } from '../domain'
import { normalizeName } from '../domain'
import { BigButton, Card, EmptyState, Row, SectionHeader, Stepper, useNavigation } from '../ui'
import { CapturedList, type CaptureEntry } from './capture/CapturedList'
import { CustomerStep } from './capture/CustomerStep'
import { ProductStep, type ChosenProduct } from './capture/ProductStep'
import { firstName } from './today/format'

interface CaptureData {
  campaign: Campaign | undefined
  orderList: Order[]
}

/**
 * Live capture.
 *
 * The rule that governs this screen: during a live only WHAT and WHO get
 * written down. No money, no address, no delivery, no payment. All of that is
 * marked afterwards from another screen. A payment field here is what makes
 * her freeze in front of the camera.
 */
export function Capture() {
  const { go } = useNavigation()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [product, setProduct] = useState<ChosenProduct | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [captures, setCaptures] = useState<CaptureEntry[]>([])
  const [saving, setSaving] = useState(false)

  const data = useLiveQuery<CaptureData>(async () => {
    const [campaign, orderList] = await Promise.all([campaigns.getActive(), orders.listAll()])
    return { campaign, orderList }
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
        <CustomerStep onPick={setCustomer} />
      ) : (
        <>
          <div className="pt-2">
            <Row
              icon={Users}
              title={customer.name}
              onClick={() => {
                setCustomer(null)
                setProduct(null)
                setQuantity(1)
              }}
              trailing={<span className="text-[1.0625rem] font-semibold text-brand">Cambiar</span>}
            />
          </div>

          <div className="mt-3">
            {!product ? (
              <ProductStep history={history} onChoose={setProduct} />
            ) : (
              <Card className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setProduct(null)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-xl leading-tight font-semibold">
                    {product.name}
                  </span>
                  <span className="mt-1 block text-[0.9375rem] font-semibold text-brand">
                    Cambiar
                  </span>
                </button>
                <Stepper value={quantity} onChange={setQuantity} />
              </Card>
            )}
          </div>
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

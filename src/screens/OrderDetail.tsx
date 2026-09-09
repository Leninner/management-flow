/**
 * El pedido por dentro: the same sheet she wrote during the live, now closed.
 *
 * Total, abonado and saldo sit at the foot behind an ink rule. Nothing here is
 * a number she typed — every one of them is derived from the lines, the
 * shipping and what came in.
 *
 * "Ya me pagó" lives beside the saldo rather than as a hero button at the
 * bottom: it is the only thing that moves that number, and under the thumb on
 * a screen she opens to read it was the loudest thing there and got pressed by
 * accident.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { DollarSign, PackageX, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { campaigns as campaignRepo, customers as customerRepo, orders as orderRepo } from '../data'
import { fromCents, missingPriceCount, orderBalance, orderSubtotalCents, productKey, toCents } from '../domain'
import {
  Card,
  ConfirmSheet,
  EmptyState,
  formatMoney,
  HeaderAction,
  MoreMenu,
  useNavigation,
} from '../ui'
import { AddLine, useCatalogue } from './orders/AddLine'
import { InvoiceLines, InvoiceSheet, InvoiceTotals } from './orders/Invoice'
import { orderStatus } from './orders/filters'
import { PaymentSheet } from './orders/PaymentSheet'
import { PriceSheet } from './orders/PriceSheet'
import { ShippingSheet } from './orders/ShippingSheet'

type OpenSheet = 'payment' | 'shipping' | 'price' | 'delete' | null

export interface OrderDetailProps {
  orderId: string
}

export function OrderDetail({ orderId }: OrderDetailProps) {
  const { push, back } = useNavigation()
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const [priceKey, setPriceKey] = useState('')
  const [draft, setDraft] = useState<{ code?: string; name: string }>({ name: '' })

  const data = useLiveQuery(async () => {
    const found = await orderRepo.get(orderId)
    // null, not undefined: undefined is what the hook returns while loading.
    if (!found) return null
    const [customer, campaign] = await Promise.all([
      customerRepo.get(found.customerId),
      campaignRepo.get(found.campaignId),
    ])
    return { order: found, customer, campaign }
  }, [orderId])

  // Hooks run before the early returns below, so this one takes an empty id
  // while the pedido is still loading rather than being called conditionally.
  const catalogue = useCatalogue(data?.order.campaignId ?? '')

  if (data === undefined) return null
  if (data === null) return <EmptyState icon={PackageX} line="Ese pedido ya no está" />

  const { order, customer, campaign } = data
  const balance = orderBalance(order)
  const paid = order.paidAmount
  const missing = missingPriceCount(order)
  const priceItem = order.items.find((item) => productKey(item) === priceKey)

  async function removeOrder() {
    await orderRepo.remove(order.id)
    back()
  }

  const settled = toCents(balance) <= 0 && missing === 0

  return (
    <>
      <HeaderAction>
        <MoreMenu
          items={[
            ...(toCents(paid) > 0
              ? [{ label: 'Corregir el abono', icon: DollarSign, onSelect: () => setSheet('payment') }]
              : []),
            { label: 'Borrar el pedido', icon: Trash2, onSelect: () => setSheet('delete'), danger: true },
          ]}
        />
      </HeaderAction>

      <div className="flex flex-col gap-3 pt-1">
        <InvoiceSheet title={customer?.name ?? 'Sin nombre'} subtitle={campaign?.name}>
          <InvoiceLines
            items={order.items}
            onPriceClick={(item) => {
              setPriceKey(productKey(item))
              setSheet('price')
            }}
            onRemove={(index) => void orderRepo.removeItem(order.id, index)}
          />
          <InvoiceTotals
            rows={
              order.shippingCost > 0 || toCents(paid) > 0
                ? [
                    { label: 'Productos', value: fromCents(orderSubtotalCents(order)) },
                    ...(order.shippingCost > 0 ? [{ label: 'Envío', value: order.shippingCost }] : []),
                    ...(toCents(paid) > 0 ? [{ label: 'Abonado', value: paid }] : []),
                  ]
                : undefined
            }
            label="Saldo"
            value={balance}
            tone={orderStatus(order)}
            note={missing > 0 ? (missing === 1 ? 'Falta 1 precio' : `Faltan ${missing} precios`) : undefined}
          />
        </InvoiceSheet>

        {!settled && (
          <div className="px-0.5 py-1">
            <button
              type="button"
              onClick={() => setSheet('payment')}
              className="inline-flex h-12 items-center rounded-full bg-card px-[1.375rem] text-[1.0625rem] font-semibold shadow-sheet active:bg-brand-soft"
            >
              Ya me pagó
            </button>
          </div>
        )}

        <Card padded={false}>
          <ActionRow
            label="Envío"
            value={order.shippingCost > 0 ? formatMoney(order.shippingCost) : 'En Ambato'}
            onClick={() => setSheet('shipping')}
          />
          {customer && (
            <ActionRow
              label="Ficha de la clienta"
              onClick={() => push({ kind: 'customerDetail', customerId: customer.id })}
            />
          )}
        </Card>
      </div>

      <PaymentSheet
        open={sheet === 'payment'}
        onClose={() => setSheet(null)}
        balance={balance}
        paid={paid}
        onPay={(amount) => void orderRepo.recordPayment(order.id, amount)}
        onClear={() => void orderRepo.recordPayment(order.id, -paid)}
      />

      <ShippingSheet
        open={sheet === 'shipping'}
        onClose={() => setSheet(null)}
        cost={order.shippingCost}
        onSave={(cost) => void orderRepo.setShippingCost(order.id, cost)}
      />

      {/* The same one line-writer as the pedido she is writing during a live:
          one act, one interface, and both of them know what a code is. */}
      <AddLine
        campaignId={order.campaignId}
        customerId={order.customerId}
        catalogue={catalogue}
        draft={draft}
        onDraft={setDraft}
      />

      <PriceSheet
        open={sheet === 'price'}
        onClose={() => setSheet(null)}
        name={priceItem ? [priceItem.code, priceItem.name].filter(Boolean).join(' ') : ''}
        price={priceItem?.price}
        onSave={(price) => void orderRepo.setItemPrice(order.id, priceKey, price)}
      />

      <ConfirmSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title="¿Borrar el pedido?"
        confirmLabel="Borrar"
        onConfirm={() => void removeOrder()}
      />
    </>
  )
}

function ActionRow({
  label,
  value,
  accent,
  onClick,
}: {
  label: string
  value?: string
  accent?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[3.75rem] w-full items-center gap-3 border-b border-line px-[1.125rem] py-2.5 text-left last:border-b-0 active:bg-brand-soft"
    >
      <span className={accent ? 'flex-1 font-semibold text-brand' : 'flex-1 font-medium'}>
        {label}
      </span>
      {value && <span className="shrink-0 text-[0.9375rem] text-muted">{value}</span>}
    </button>
  )
}

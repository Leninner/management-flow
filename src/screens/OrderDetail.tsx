/**
 * El pedido por dentro. This is where an order gets settled: the balance at
 * the top in the colour of its state, the items she can fix when Oriflame
 * ships short, one tap to say it was paid in full, and one tap to say it went
 * out. Nothing here is a total she typed: every number is derived from the
 * items, the shipping and what was paid.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, MessageCircle, PackageX, Plus, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import {
  campaigns as campaignRepo,
  customers as customerRepo,
  orders as orderRepo,
  settings as settingsRepo,
} from '../data'
import { orderBalance, orderSubtotal, orderTotal, toCents } from '../domain'
import {
  BigButton,
  Card,
  EmptyState,
  formatMoney,
  Money,
  Row,
  SectionHeader,
  useNavigation,
} from '../ui'
import { AddItemSheet } from './orders/AddItemSheet'
import { ConfirmSheet } from './orders/ConfirmSheet'
import { orderStatus } from './orders/filters'
import { formatShortDate, todayIso } from './orders/format'
import { ItemCard } from './orders/ItemCard'
import { displayItems, itemHistory, setItemPrice, setItemQuantity } from './orders/items'
import { PaymentSheet } from './orders/PaymentSheet'
import { PriceSheet } from './orders/PriceSheet'
import { ShippingSheet } from './orders/ShippingSheet'
import { StepRow } from './orders/StepRow'
import { bankAccountFrom, openWhatsapp, orderMessage, templatesFrom } from './orders/whatsapp'

type OpenSheet = 'payment' | 'shipping' | 'addItem' | 'price' | 'delete' | null

export interface OrderDetailProps {
  orderId: string
}

export function OrderDetail({ orderId }: OrderDetailProps) {
  const { push, back } = useNavigation()
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const [priceIndex, setPriceIndex] = useState(0)

  const data = useLiveQuery(async () => {
    const found = await orderRepo.get(orderId)
    // null, not undefined: undefined is what the hook returns while loading.
    if (!found) return null
    const [customer, campaign, all, stored] = await Promise.all([
      customerRepo.get(found.customerId),
      campaignRepo.get(found.campaignId),
      orderRepo.listAll(),
      settingsRepo.all(),
    ])
    return { order: found, customer, campaign, history: itemHistory(all), stored }
  }, [orderId])

  if (data === undefined) return null
  if (data === null) return <EmptyState icon={PackageX} line="Ese pedido ya no está" />

  const { order, customer, campaign, history, stored } = data
  const balance = orderBalance(order)
  const total = orderTotal(order)
  const paid = order.paidAmount
  const items = displayItems(order)
  const priceItem = order.items[priceIndex]

  async function pay(amount: number) {
    await orderRepo.recordPayment(order.id, amount)
    // Money in the hand is a confirmed order, whatever the flag said before.
    if (!order.confirmed) await orderRepo.markConfirmed(order.id)
  }

  function writeOnWhatsapp() {
    const message = orderMessage({
      order,
      customer,
      campaign,
      templates: templatesFrom(stored),
      bankAccount: bankAccountFrom(stored),
      today: todayIso(),
    })
    // Opened inside the tap so the browser does not take it for a pop-up.
    openWhatsapp(customer?.whatsapp, message)
    void orderRepo.recordContact(order.id)
  }

  async function removeOrder() {
    await orderRepo.remove(order.id)
    back()
  }

  return (
    <>
      <div className="flex flex-col gap-2 pt-4">
        <Row
          status={orderStatus(order)}
          title={customer?.name ?? 'Sin nombre'}
          subtitle={[campaign?.name, customer?.whatsapp].filter(Boolean).join(' · ')}
          onClick={
            customer ? () => push({ kind: 'customerDetail', customerId: customer.id }) : undefined
          }
        />

        <Card className="flex flex-col gap-3">
          <span className="text-[0.9375rem] font-bold tracking-widest text-muted uppercase">
            Saldo
          </span>
          <Money value={balance} size="xl" tone={toCents(balance) > 0 ? 'owes' : 'done'} />
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <Labeled label="Total" value={total} />
            <Labeled label="Abonado" value={paid} />
          </div>
          {toCents(balance) > 0 && (
            <BigButton floating={false} variant="quiet" onClick={() => setSheet('payment')}>
              Abonó una parte
            </BigButton>
          )}
          {toCents(balance) <= 0 && toCents(paid) > 0 && (
            <BigButton floating={false} variant="quiet" onClick={() => setSheet('payment')}>
              Corregir el abono
            </BigButton>
          )}
        </Card>

        <BigButton
          floating={false}
          variant="quiet"
          icon={MessageCircle}
          onClick={writeOnWhatsapp}
        >
          WhatsApp
        </BigButton>
      </div>

      <SectionHeader title="Estado" />
      <Card padded={false} className="divide-y divide-line">
        <StepRow
          done={order.confirmed}
          label={order.confirmed ? 'Confirmado' : 'Confirmar'}
          onDo={order.confirmed ? undefined : () => void orderRepo.markConfirmed(order.id)}
          onUndo={() => void orderRepo.markConfirmed(order.id, false)}
        />
        <StepRow
          done={order.deliveredAt !== undefined}
          label={order.deliveredAt ? 'Entregado' : 'Entregar'}
          detail={order.deliveredAt ? formatShortDate(order.deliveredAt) : undefined}
          onDo={order.deliveredAt ? undefined : () => void orderRepo.markDelivered(order.id)}
        />
      </Card>

      <SectionHeader
        title="Productos"
        count={order.items.length}
        action={<Money value={orderSubtotal(order)} size="lg" />}
      />
      <div className="flex flex-col gap-2">
        {items.map(({ item, index }) => (
          <ItemCard
            key={`${index}-${item.name}`}
            item={item}
            onQuantityChange={(quantity) => void setItemQuantity(order, index, quantity)}
            onPriceClick={() => {
              setPriceIndex(index)
              setSheet('price')
            }}
            onRemove={() => void orderRepo.removeItem(order.id, index)}
          />
        ))}

        <Row icon={Plus} title="Agregar producto" onClick={() => setSheet('addItem')} />

        <Row
          icon={Truck}
          title="Envío"
          subtitle={order.shippingCost > 0 ? formatMoney(order.shippingCost) : 'En Ambato'}
          onClick={() => setSheet('shipping')}
        />
      </div>

      <div className="pt-10">
        <BigButton
          floating={false}
          variant="danger"
          icon={Trash2}
          onClick={() => setSheet('delete')}
        >
          Borrar pedido
        </BigButton>
      </div>

      {toCents(balance) > 0 && (
        <BigButton icon={Check} onClick={() => void pay(balance)}>
          Pagó todo
        </BigButton>
      )}
      {toCents(balance) <= 0 && !order.deliveredAt && (
        <BigButton icon={Truck} onClick={() => void orderRepo.markDelivered(order.id)}>
          Entregado
        </BigButton>
      )}

      <PaymentSheet
        open={sheet === 'payment'}
        onClose={() => setSheet(null)}
        balance={balance}
        paid={paid}
        onPay={(amount) => void pay(amount)}
        onClear={() => void orderRepo.recordPayment(order.id, -paid)}
      />

      <ShippingSheet
        open={sheet === 'shipping'}
        onClose={() => setSheet(null)}
        cost={order.shippingCost}
        onSave={(cost) => void orderRepo.setShippingCost(order.id, cost)}
      />

      <AddItemSheet
        open={sheet === 'addItem'}
        onClose={() => setSheet(null)}
        history={history}
        onAdd={(item) =>
          void orderRepo.addItem({
            campaignId: order.campaignId,
            customerId: order.customerId,
            item,
          })
        }
      />

      <PriceSheet
        open={sheet === 'price'}
        onClose={() => setSheet(null)}
        name={priceItem?.name ?? ''}
        price={priceItem?.price ?? 0}
        onSave={(price) => void setItemPrice(order, priceIndex, price)}
      />

      <ConfirmSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title="¿Borrar el pedido?"
        confirmLabel="Sí, borrar"
        onConfirm={() => void removeOrder()}
      >
        <Row
          status={orderStatus(order)}
          title={customer?.name ?? 'Sin nombre'}
          subtitle={`${order.items.length} productos`}
          amount={total}
        />
      </ConfirmSheet>
    </>
  )
}

function Labeled({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[0.9375rem] text-muted">{label}</span>
      <Money value={value} size="md" />
    </span>
  )
}

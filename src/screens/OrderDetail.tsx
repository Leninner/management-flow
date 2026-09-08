/**
 * El pedido por dentro. This is where an order gets settled: the balance at
 * the top in the colour of its state, the items she can fix when Oriflame
 * ships short, one tap to say it was paid in full, and one tap to say it went
 * out. Nothing here is a total she typed: every number is derived from the
 * items, the shipping and what was paid.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, DollarSign, MessageCircle, PackageX, Plus, Truck } from 'lucide-react'
import { useState } from 'react'
import {
  campaigns as campaignRepo,
  customers as customerRepo,
  orders as orderRepo,
  settings as settingsRepo,
} from '../data'
import { whatsappUrl } from '../content/whatsapp'
import { orderBalance, orderTotal, toCents } from '../domain'
import {
  BigButton,
  Card,
  EmptyState,
  formatMoney,
  HeaderAction,
  Money,
  Row,
  SectionHeader,
  useNavigation,
} from '../ui'
import { AddItemSheet } from './orders/AddItemSheet'
import { ConfirmSheet } from './orders/ConfirmSheet'
import { orderStatus } from './orders/filters'
import { todayIso } from './orders/format'
import { ItemList } from './orders/ItemList'
import { itemHistory } from './orders/items'
import { PaymentSheet } from './orders/PaymentSheet'
import { PriceSheet } from './orders/PriceSheet'
import { ShippingSheet } from './orders/ShippingSheet'
import { OrderMenu } from './orders/OrderMenu'
import { OrderSteps, type OrderStep } from './orders/OrderSteps'
import {
  bankAccountFrom,
  ORDER_MESSAGE_LABEL,
  orderMessage,
  templateForOrder,
  templatesFrom,
} from './orders/whatsapp'

type OpenSheet = 'payment' | 'shipping' | 'addItem' | 'price' | 'delete' | null

export interface OrderDetailProps {
  orderId: string
}

export function OrderDetail({ orderId }: OrderDetailProps) {
  const { push, back } = useNavigation()
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const [priceName, setPriceName] = useState('')

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
  const priceItem = order.items.find((item) => item.name === priceName)

  async function pay(amount: number) {
    await orderRepo.recordPayment(order.id, amount)
    // Money in the hand is a confirmed order, whatever the flag said before.
    if (!order.confirmed) await orderRepo.markConfirmed(order.id)
  }

  // A real link, never window.open: with a features string the browser reads
  // it as a pop-up and an installed PWA drops it without saying anything.
  const whatsappHref = whatsappUrl(
    customer?.whatsapp,
    orderMessage({
      order,
      customer,
      campaign,
      templates: templatesFrom(stored),
      bankAccount: bankAccountFrom(stored),
      today: todayIso(),
    }),
  )

  async function removeOrder() {
    await orderRepo.remove(order.id)
    back()
  }

  const settled = toCents(balance) <= 0
  const steps: OrderStep[] = [
    { label: 'Confirmado', done: order.confirmed, icon: Check },
    { label: 'Pagado', done: settled && toCents(total) > 0, icon: DollarSign },
    { label: 'Entregado', done: order.deliveredAt !== undefined, icon: Truck },
  ]

  // The message this order is asking for, named on the button that sends it.
  const messageLabel = ORDER_MESSAGE_LABEL[templateForOrder(order, campaign, todayIso())]

  return (
    <>
      <HeaderAction>
        <OrderMenu
          onDelete={() => setSheet('delete')}
          onUnconfirm={
            order.confirmed ? () => void orderRepo.markConfirmed(order.id, false) : undefined
          }
          onFixPayment={toCents(paid) > 0 ? () => setSheet('payment') : undefined}
        />
      </HeaderAction>

      <div className="flex flex-col gap-2 pt-4">
        <Row
          status={orderStatus(order)}
          title={customer?.name ?? 'Sin nombre'}
          subtitle={[campaign?.name, customer?.whatsapp].filter(Boolean).join(' · ')}
          onClick={
            customer ? () => push({ kind: 'customerDetail', customerId: customer.id }) : undefined
          }
        />

        {/*
          La plata y el estado en una sola tarjeta. Los pasos vivían en una
          tarjeta aparte de 115px para reportar tres booleanos, y con eso los
          productos empezaban recién debajo del borde de la pantalla.
        */}
        <Card padded={false}>
          <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
            <span className="text-[0.9375rem] font-semibold text-muted">Saldo</span>
            <Money value={balance} size="xl" tone={toCents(balance) > 0 ? 'owes' : 'done'} />
            {/* With nothing paid in, Total is the same number as Saldo above. */}
            {toCents(paid) > 0 && (
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <Labeled label="Total" value={total} />
                <Labeled label="Abonado" value={paid} />
              </div>
            )}
            {/*
              Sólo cuando falta plata. Corregir un abono ya cerrado es una
              recuperación, no algo de todos los días: vive en el menú.
            */}
            {toCents(balance) > 0 && (
              <BigButton
                floating={false}
                variant="quiet"
                className="mt-1"
                onClick={() => setSheet('payment')}
              >
                Abonó una parte
              </BigButton>
            )}
          </div>

          <OrderSteps steps={steps} />
        </Card>

        <BigButton
          floating={false}
          variant="quiet"
          icon={MessageCircle}
          href={whatsappHref}
          onClick={() => void orderRepo.recordContact(order.id)}
        >
          {messageLabel}
        </BigButton>
      </div>

      <SectionHeader title="Productos" count={order.items.length} />
      <div className="flex flex-col gap-2">
        <ItemList
          items={order.items}
          shipping={order.shippingCost}
          onQuantityChange={(index, quantity) => {
            const item = order.items[index]
            if (item) void orderRepo.setItemQuantity(order.id, item.name, quantity)
          }}
          onPriceClick={(item) => {
            setPriceName(item.name)
            setSheet('price')
          }}
          onRemove={(index) => void orderRepo.removeItem(order.id, index)}
        />

        <Row icon={Plus} title="Agregar producto" onClick={() => setSheet('addItem')} />

        <Row
          icon={Truck}
          title="Envío"
          subtitle={order.shippingCost > 0 ? formatMoney(order.shippingCost) : 'En Ambato'}
          onClick={() => setSheet('shipping')}
        />
      </div>

      {/*
        One next step, and it is the one the pedido is actually on. This used
        to say "Pagó todo" whenever there was a balance, so an order nobody had
        even confirmed offered marking it paid in full as its loudest action.
      */}
      {!order.confirmed ? (
        <BigButton icon={Check} onClick={() => void orderRepo.markConfirmed(order.id)}>
          Confirmar pedido
        </BigButton>
      ) : toCents(balance) > 0 ? (
        <BigButton icon={Check} onClick={() => void pay(balance)}>
          Pagó todo
        </BigButton>
      ) : !order.deliveredAt ? (
        <BigButton icon={Truck} onClick={() => void orderRepo.markDelivered(order.id)}>
          Entregado
        </BigButton>
      ) : null}

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
        onSave={(price) => void orderRepo.setItemPrice(order.id, priceName, price)}
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

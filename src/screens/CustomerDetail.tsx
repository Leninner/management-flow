/**
 * La ficha del cliente.
 *
 * Two things live here that exist nowhere else: the aliases, which are how the
 * TikTok identity and the WhatsApp identity become one person, and the debt
 * carried from campaigns that already closed, which is where the money of this
 * business actually gets lost.
 *
 * The screen is ordered by what she came for: who this is, whether they owe
 * her, what they have bought, and only then the maintenance. Editing lives
 * behind the identity card, so nothing is an open form until she asks for one.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, MessageCircle, Merge, ShoppingBag, UserX } from 'lucide-react'
import { useState } from 'react'
import {
  campaigns as campaignRepo,
  customers as customerRepo,
  orders as orderRepo,
} from '../data'
import { whatsappUrl } from '../content/whatsapp'
import { carriedDebt, contactsOf, nowIso, orderBalance } from '../domain'
import {
  Avatar,
  BigButton,
  Card,
  EmptyState,
  formatMoney,
  Money,
  Row,
  SectionHeader,
  StatusDot,
  StatusPill,
  useNavigation,
} from '../ui'
import { EditCustomerSheet } from './customers/EditCustomerSheet'
import { MergeSheet } from './customers/MergeSheet'
import { orderStatus, owedBy } from './orders/filters'
import { orderStateLine, todayIso } from './orders/format'

type OpenSheet = 'edit' | 'merge' | null

export interface CustomerDetailProps {
  customerId: string
}

export function CustomerDetail({ customerId }: CustomerDetailProps) {
  const { push } = useNavigation()
  const [sheet, setSheet] = useState<OpenSheet>(null)

  const data = useLiveQuery(async () => {
    const found = await customerRepo.get(customerId)
    // null, not undefined: undefined is what the hook returns while loading.
    if (!found) return null
    const [people, allOrders, active, campaignList] = await Promise.all([
      customerRepo.list(),
      orderRepo.listAll(),
      campaignRepo.getActive(),
      campaignRepo.list(),
    ])
    return { customer: found, people, allOrders, active, campaignList }
  }, [customerId])

  if (data === undefined) return null
  if (data === null) return <EmptyState icon={UserX} line="Ese cliente ya no está" />

  const { customer, people, allOrders, active, campaignList } = data
  const aliases = customer.aliases ?? []
  const theirs = allOrders
    .filter((order) => order.customerId === customer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const owed = owedBy(theirs)
  const carried = carriedDebt(theirs, active?.id)
  const campaignName = new Map(campaignList.map((campaign) => [campaign.id, campaign.name]))
  const today = todayIso()

  // How she knows this person, in the order she would say it out loud.
  const identity = [...aliases, customer.whatsapp].filter(Boolean).join(' · ')

  function markWritten() {
    void customerRepo.update(customer.id, { contacts: [...contactsOf(customer), nowIso()] })
  }

  return (
    <>
      <div className="flex flex-col gap-2 pt-4">
        <Card padded={false}>
          <button
            type="button"
            onClick={() => setSheet('edit')}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-brand-soft"
          >
            <Avatar name={customer.name} size="lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[1.375rem] leading-tight font-semibold">
                {customer.name}
              </span>
              {identity !== '' && (
                <span className="mt-1 block truncate text-[0.9375rem] text-muted">{identity}</span>
              )}
            </span>
            <ChevronRight size={22} className="shrink-0 text-muted/45" aria-hidden="true" />
          </button>
        </Card>

        {/*
          A debt is the biggest thing on the screen only when there is one.
          A green $0.00 at 36px used to be the largest element on the profile
          of somebody who owes nothing, which is the most common case there is.
        */}
        {owed > 0 ? (
          <Card>
            <span className="text-[0.8125rem] font-semibold tracking-wide text-muted uppercase">
              Debe
            </span>
            <span className="mt-1.5 block">
              <Money value={owed} size="xl" tone="owes" />
            </span>
            {carried > 0 && (
              <span className="mt-3 block">
                <StatusPill status="owes" label={`${formatMoney(carried)} de campañas pasadas`} />
              </span>
            )}
          </Card>
        ) : (
          <Card className="flex items-center gap-2.5">
            <StatusDot status="done" />
            <span className="text-[1.0625rem] font-semibold">Al día</span>
          </Card>
        )}
      </div>

      <SectionHeader title="Pedidos" count={theirs.length} />
      {theirs.length === 0 ? (
        <EmptyState compact icon={ShoppingBag} line="Todavía no te ha pedido" />
      ) : (
        <div className="flex flex-col gap-2">
          {theirs.map((order) => (
            <Row
              key={order.id}
              status={orderStatus(order)}
              title={campaignName.get(order.campaignId) ?? 'Sin campaña'}
              subtitle={orderStateLine(order, today)}
              amount={orderBalance(order)}
              onClick={() => push({ kind: 'orderDetail', orderId: order.id })}
            />
          ))}
        </div>
      )}

      <div className="pt-6">
        <Row icon={Merge} title="Fusionar con otro" onClick={() => setSheet('merge')} />
      </div>

      {/*
        There is always one primary action. Without a number the screen used to
        have none at all, which is exactly the person who arrives from a live
        as an @handle and nothing else, so the button becomes the thing that
        fixes that.
      */}
      {customer.whatsapp ? (
        <BigButton
          icon={MessageCircle}
          href={whatsappUrl(customer.whatsapp, '')}
          onClick={markWritten}
        >
          WhatsApp
        </BigButton>
      ) : (
        <BigButton icon={MessageCircle} onClick={() => setSheet('edit')}>
          Agregar WhatsApp
        </BigButton>
      )}

      <EditCustomerSheet
        open={sheet === 'edit'}
        onClose={() => setSheet(null)}
        customer={customer}
        onSave={({ name, whatsapp, address, aliases: nextAliases }) =>
          void customerRepo.update(customer.id, {
            name,
            whatsapp: whatsapp === '' ? undefined : whatsapp,
            address: address === '' ? undefined : address,
            aliases: nextAliases,
          })
        }
      />

      <MergeSheet
        open={sheet === 'merge'}
        onClose={() => setSheet(null)}
        target={customer}
        people={people}
        orders={allOrders}
        onMerge={(sourceId) => void customerRepo.merge(customer.id, sourceId)}
      />
    </>
  )
}

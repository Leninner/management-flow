/**
 * La ficha del cliente.
 *
 * Two things live here that exist nowhere else: the aliases, which are how the
 * TikTok identity and the WhatsApp identity become one person, and the debt
 * carried from campaigns that already closed, which is where the money of this
 * business actually gets lost.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { MessageCircle, Merge, ShoppingBag, Trash2, User, UserX } from 'lucide-react'
import { useState } from 'react'
import {
  campaigns as campaignRepo,
  customers as customerRepo,
  orders as orderRepo,
} from '../data'
import { whatsappUrl } from '../content/whatsapp'
import { carriedDebt, contactsOf, nowIso, normalizeText, orderBalance } from '../domain'
import {
  BigButton,
  Card,
  ConfirmSheet,
  EmptyState,
  formatMoney,
  HeaderAction,
  Money,
  MoreMenu,
  Row,
  SectionHeader,
  StatusPill,
  useNavigation,
} from '../ui'
import { AliasEditor } from './customers/AliasEditor'
import { EditCustomerSheet } from './customers/EditCustomerSheet'
import { MergeSheet } from './customers/MergeSheet'
import { orderStatus, owedBy } from './orders/filters'
import { orderStateLine, todayIso } from './orders/format'

type OpenSheet = 'edit' | 'merge' | 'delete' | null

export interface CustomerDetailProps {
  customerId: string
}

export function CustomerDetail({ customerId }: CustomerDetailProps) {
  const { push, back } = useNavigation()
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

  function addAlias(alias: string) {
    const key = normalizeText(alias)
    if (key === '' || key === normalizeText(customer.name)) return
    if (aliases.some((existing) => normalizeText(existing) === key)) return
    void customerRepo.update(customer.id, { aliases: [...aliases, alias] })
  }

  async function removeCustomer() {
    await customerRepo.remove(customer.id)
    back()
  }

  function markWritten() {
    void customerRepo.update(customer.id, { contacts: [...contactsOf(customer), nowIso()] })
  }

  return (
    <>
      <HeaderAction>
        <MoreMenu
          items={[
            { label: 'Borrar el cliente', icon: Trash2, onSelect: () => setSheet('delete') },
          ]}
        />
      </HeaderAction>

      <div className="flex flex-col gap-2 pt-4">
        <Row
          icon={User}
          title={customer.name}
          subtitle={[customer.whatsapp, customer.address].filter(Boolean).join(' · ')}
          onClick={() => setSheet('edit')}
        />

        <Card className="flex flex-col gap-3">
          <span className="text-[0.9375rem] font-semibold text-muted">
            Debe
          </span>
          <Money value={owed} size="xl" tone={owed > 0 ? 'owes' : 'done'} />
          {carried > 0 && (
            <StatusPill status="owes" label={`${formatMoney(carried)} de campañas pasadas`} />
          )}
        </Card>
      </div>

      <SectionHeader title="Alias" count={aliases.length} />
      <AliasEditor
        aliases={aliases}
        onAdd={addAlias}
        onRemove={(alias) =>
          void customerRepo.update(customer.id, {
            aliases: aliases.filter((existing) => existing !== alias),
          })
        }
      />

      <SectionHeader title="Pedidos" count={theirs.length} />
      {theirs.length === 0 ? (
        <EmptyState icon={ShoppingBag} line="Todavía no te ha pedido" />
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

      <div className="pt-10">
        <Row icon={Merge} title="Fusionar con otro" onClick={() => setSheet('merge')} />
      </div>

      {customer.whatsapp && (
        <BigButton
          icon={MessageCircle}
          href={whatsappUrl(customer.whatsapp, '')}
          onClick={markWritten}
        >
          WhatsApp
        </BigButton>
      )}

      <EditCustomerSheet
        open={sheet === 'edit'}
        onClose={() => setSheet(null)}
        customer={customer}
        onSave={({ name, whatsapp, address }) =>
          void customerRepo.update(customer.id, {
            name,
            whatsapp: whatsapp === '' ? undefined : whatsapp,
            address: address === '' ? undefined : address,
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

      <ConfirmSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title="¿Borrar el cliente?"
        confirmLabel="Sí, borrar"
        onConfirm={() => void removeCustomer()}
      >
        <Row icon={User} title={customer.name} subtitle={customer.whatsapp} />
        {theirs.length > 0 && (
          <Row
            icon={ShoppingBag}
            title={theirs.length === 1 ? 'Se borra 1 pedido' : `Se borran ${theirs.length} pedidos`}
            amount={owed}
          />
        )}
      </ConfirmSheet>
    </>
  )
}

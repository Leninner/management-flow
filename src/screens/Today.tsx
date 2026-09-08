import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { campaigns, customers, orders, settings } from '../data'
import type { Campaign, Customer, Order, Setting } from '../db/types'
import {
  campaignProfitCents,
  campaignSoldCents,
  daysBetween,
  followUps,
  fromCents,
  nextCardCutoff,
  orderBalanceCents,
  toRecoverCents,
} from '../domain'
import {
  EmptyState,
  Money,
  Row,
  SectionHeader,
  Stat,
  StatGrid,
  useNavigation,
} from '../ui'
import { readCardSettings } from './more/card'
import { CampaignHeader } from './today/CampaignHeader'
import { FirstRun } from './today/FirstRun'
import { FollowUpRow } from './today/FollowUpRow'
import { inDaysLabel, todayIso } from './today/format'
import { InvoiceSheet } from './today/InvoiceSheet'
import { buildTemplates } from './today/messages'

interface TodayData {
  campaignList: Campaign[]
  customerList: Customer[]
  orderList: Order[]
  settingList: Setting[]
}

/** The two summary tiles that open a filtered list of Pedidos. */
export type OrdersShortcut = 'toCollect' | 'toDeliver'

export interface TodayProps {
  /**
   * Wired by the shell into the `initialFilter` of Pedidos, so "Por cobrar"
   * lands on the list it names. Left out, the tap still opens Pedidos; it just
   * arrives on whatever filter was last used.
   */
  onOpenOrders?: (filter: OrdersShortcut) => void
}

/**
 * The home screen: the money, then the to-do list of the day.
 *
 * The money goes first because it is a glance and the list is work. Four tiles
 * answer what she opens the app to find out — what she is earning, what has not
 * been collected, how much of what she fronted with the card has not come back,
 * and when that card closes — before she has read a single word.
 */
export function Today({ onOpenOrders }: TodayProps) {
  const { go } = useNavigation()
  const today = todayIso()
  const [editingInvoice, setEditingInvoice] = useState(false)

  function openOrders(filter: OrdersShortcut) {
    if (onOpenOrders) onOpenOrders(filter)
    else go('orders')
  }

  const data = useLiveQuery<TodayData>(async () => {
    const [campaignList, customerList, orderList, settingList] = await Promise.all([
      campaigns.list(),
      customers.list(),
      orders.listAll(),
      settings.all(),
    ])
    return { campaignList, customerList, orderList, settingList }
  }, [])

  const campaign = data?.campaignList.find((entry) => entry.active)
  const pending =
    data && campaign
      ? followUps({
          orders: data.orderList,
          customers: data.customerList,
          campaigns: data.campaignList,
          today,
        })
      : []

  useAppBadge(pending.length)

  // Dexie answers on the second render. Painting anything before that would
  // flash the first-run form at somebody who has been using this for months.
  if (!data) return null
  if (!campaign) return <FirstRun />

  const customerById = new Map(data.customerList.map((entry) => [entry.id, entry]))
  const orderById = new Map(data.orderList.map((entry) => [entry.id, entry]))
  const campaignById = new Map(data.campaignList.map((entry) => [entry.id, entry]))
  const templates = buildTemplates(data.settingList)
  const values = new Map(data.settingList.map((entry) => [entry.key, entry.value]))

  // Every campaign, not only the open one: what somebody still owes from the
  // last catalogue is exactly the money that gets lost, and this tile has to
  // say the same number as the Pedidos list it opens.
  const receivable = data.orderList.filter(
    (order) => order.confirmed && orderBalanceCents(order) > 0,
  )
  // Added up in cents by the domain. No total is ever stored.
  const receivableCents = receivable.reduce((cents, order) => cents + orderBalanceCents(order), 0)
  const undelivered = data.orderList.filter((order) => order.confirmed && !order.deliveredAt)

  const profitCents = campaignProfitCents(data.orderList, campaign)
  const soldCents = campaignSoldCents(data.orderList, campaign.id)
  const recoverCents = toRecoverCents(data.orderList, data.campaignList)

  const card = readCardSettings(values)
  const cardCutoff = nextCardCutoff(today, card.cutoffDay)

  // No invoice yet means no profit to state. Rather than invent one, the tile
  // shows what she has sold and the tap is how the invoice gets written down.
  const earned = profitCents ?? soldCents

  return (
    <>
      <CampaignHeader campaign={campaign} today={today} />

      <div className="pt-3">
        <StatGrid>
          <Stat
            label={profitCents === undefined ? 'Vendí' : 'Gano'}
            // Early in a campaign the invoice is already paid and the sales
            // are not in yet, so this is legitimately negative. Red says so.
            value={<Money value={fromCents(earned)} size="lg" tone={earned < 0 ? 'owes' : undefined} />}
            muted={earned === 0}
            onClick={() => setEditingInvoice(true)}
          />
          <Stat
            label="Por cobrar"
            tone="owes"
            value={
              <span className="flex items-baseline gap-2">
                <Money
                  value={fromCents(receivableCents)}
                  size="lg"
                  tone={receivableCents > 0 ? 'owes' : undefined}
                />
                {receivable.length > 0 && (
                  <span className="money text-[0.9375rem] font-semibold text-muted tabular-nums">
                    ({receivable.length})
                  </span>
                )}
              </span>
            }
            muted={receivableCents === 0}
            onClick={() => openOrders('toCollect')}
          />
          <Stat
            label="Falta recuperar"
            tone="owes"
            value={
              <Money
                value={fromCents(recoverCents)}
                size="lg"
                tone={recoverCents > 0 ? 'owes' : undefined}
              />
            }
            muted={recoverCents === 0}
            onClick={() => openOrders('toCollect')}
          />
          {cardCutoff ? (
            <Stat
              label="Tarjeta corta"
              value={
                <span className="text-[1.5rem] leading-none font-bold tracking-tight">
                  {inDaysLabel(daysBetween(today, cardCutoff))}
                </span>
              }
              onClick={() => go('more')}
            />
          ) : (
            <Stat
              label="Tarjeta"
              value={<span className="text-[1.5rem] leading-none font-bold">Configurar</span>}
              muted
              onClick={() => go('more')}
            />
          )}
        </StatGrid>
      </div>

      <SectionHeader title="Pendiente" count={pending.length} />
      {pending.length === 0 ? (
        <EmptyState compact icon={CalendarCheck} line="Nada pendiente por hoy" />
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map((followUp) => {
            const customer = customerById.get(followUp.customerId)
            if (!customer) return null
            const order = followUp.orderId ? orderById.get(followUp.orderId) : undefined
            return (
              <FollowUpRow
                key={`${followUp.templateKey}:${followUp.orderId ?? followUp.customerId}`}
                followUp={followUp}
                customer={customer}
                order={order}
                campaign={order ? campaignById.get(order.campaignId) : campaign}
                templates={templates}
                settingList={data.settingList}
                today={today}
              />
            )
          })}
        </div>
      )}

      <div className="pt-6">
        <Row
          status={undelivered.length > 0 ? 'pending' : undefined}
          title="Por entregar"
          count={undelivered.length}
          onClick={() => openOrders('toDeliver')}
        />
      </div>

      <InvoiceSheet
        open={editingInvoice}
        onClose={() => setEditingInvoice(false)}
        campaign={campaign}
      />
    </>
  )
}

interface BadgeNavigator {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

/**
 * The only passive reminder the app has. A PWA with no backend cannot push a
 * notification, so the count of things waiting rides on the icon itself.
 */
function useAppBadge(count: number) {
  useEffect(() => {
    const badges = navigator as unknown as BadgeNavigator
    const applied = count > 0 ? badges.setAppBadge?.(count) : badges.clearAppBadge?.()
    // Denied permission, an uninstalled PWA, a browser without the API: the
    // badge is a nicety and its absence must never break the screen.
    applied?.catch(() => {})
  }, [count])
}

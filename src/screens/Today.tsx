import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarCheck } from 'lucide-react'
import { useEffect } from 'react'
import { campaigns, customers, orders, settings } from '../data'
import type { Campaign, Customer, Order, Setting } from '../db/types'
import { followUps, fromCents, orderBalanceCents } from '../domain'
import { EmptyState, Row, SectionHeader, useNavigation } from '../ui'
import { CampaignHeader } from './today/CampaignHeader'
import { FirstRun } from './today/FirstRun'
import { FollowUpRow } from './today/FollowUpRow'
import { todayIso } from './today/format'
import { buildTemplates } from './today/messages'

interface TodayData {
  campaignList: Campaign[]
  customerList: Customer[]
  orderList: Order[]
  settingList: Setting[]
}

/** The two summary rows only ever open these two views of Pedidos. */
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
 * The home screen, and the to-do list of the day. Everything on it is either
 * a deadline, something to write, or money that has not come in yet.
 */
export function Today({ onOpenOrders }: TodayProps) {
  const { go } = useNavigation()
  const today = todayIso()

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

  // Every campaign, not only the open one: what somebody still owes from the
  // last catalogue is exactly the money that gets lost, and these two rows have
  // to say the same number as the Pedidos list they open.
  const receivable = data.orderList.filter(
    (order) => order.confirmed && orderBalanceCents(order) > 0,
  )
  // Added up in cents by the domain. No total is ever stored.
  const receivableTotal = fromCents(
    receivable.reduce((cents, order) => cents + orderBalanceCents(order), 0),
  )
  const undelivered = data.orderList.filter((order) => order.confirmed && !order.deliveredAt)

  return (
    <>
      <CampaignHeader campaign={campaign} today={today} />

      <SectionHeader title="Hoy" count={pending.length} />
      {pending.length === 0 ? (
        <EmptyState icon={CalendarCheck} line="Nada pendiente por hoy" />
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

      <div className="flex flex-col gap-2 pt-6">
        <Row
          status="owes"
          title="Por cobrar"
          amount={receivableTotal}
          count={receivable.length}
          onClick={() => openOrders('toCollect')}
        />
        <Row
          status="pending"
          title="Por entregar"
          count={undelivered.length}
          onClick={() => openOrders('toDeliver')}
        />
      </div>

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

import { Check, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { customers, orders } from '../../data'
import type { Campaign, Customer, Order, Setting } from '../../db/types'
import type { FollowUp } from '../../domain'
import { nowIso, orderBalance, orderBalanceCents, orderTotal } from '../../domain'
import { whatsappUrl } from '../../content/whatsapp'
import { Row, RowAction } from '../../ui'
import { daysLabel } from './format'
import {
  bankAccount,
  FOLLOW_UP_REASON,
  FOLLOW_UP_STATUS,
  renderFollowUpMessage,
} from './messages'

export interface FollowUpRowProps {
  followUp: FollowUp
  customer: Customer
  order: Order | undefined
  campaign: Campaign | undefined
  templates: Map<string, string>
  settingList: readonly Setting[]
  today: string
}

/**
 * One thing to do, with the only two answers it can have: write to her, or
 * say it is already written. The second one is what makes the list shrink;
 * without it the app repeats the same ten names every morning.
 */
export function FollowUpRow({
  followUp,
  customer,
  order,
  campaign,
  templates,
  settingList,
  today,
}: FollowUpRowProps) {
  const [writing, setWriting] = useState(false)

  const amount = pendingAmount(followUp, order)
  const subtitle = `${FOLLOW_UP_REASON[followUp.templateKey]}, ${daysLabel(followUp.daysWaiting)}`

  // A real link, never window.open: with a features string the browser reads
  // it as a pop-up and an installed PWA drops it without saying anything.
  const whatsappHref = whatsappUrl(
    customer.whatsapp,
    renderFollowUpMessage({
      followUp,
      customer,
      order,
      campaign,
      templates,
      account: bankAccount(settingList),
      today,
    }),
  )

  async function markWritten() {
    if (writing) return
    setWriting(true)
    try {
      if (followUp.orderId) {
        await orders.recordContact(followUp.orderId)
      } else {
        // A reengage chases the person, not an order, so the contact is
        // recorded on the customer. Insisting burns customers, and losing a
        // sale is cheaper than losing a client.
        await customers.update(customer.id, { contacts: [...customer.contacts, nowIso()] })
      }
    } finally {
      setWriting(false)
    }
  }

  return (
    <Row
      status={FOLLOW_UP_STATUS[followUp.templateKey]}
      title={customer.name}
      subtitle={subtitle}
      amount={amount}
      actions={
        <>
          <RowAction icon={MessageCircle} href={whatsappHref}>
            WhatsApp
          </RowAction>
          <RowAction icon={Check} onClick={markWritten}>
            Ya le escribí
          </RowAction>
        </>
      }
    />
  )
}

/**
 * What is still open on the order. A repurchase or a reengage is not a money
 * question, so those rows carry no amount at all.
 */
function pendingAmount(followUp: FollowUp, order: Order | undefined): number | undefined {
  if (!order) return undefined
  if (followUp.templateKey === 'repurchase') return undefined
  return orderBalanceCents(order) > 0 ? orderBalance(order) : orderTotal(order)
}

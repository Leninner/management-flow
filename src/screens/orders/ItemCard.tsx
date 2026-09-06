/**
 * One line of the pedido.
 *
 * Removing has to be a single tap and nothing else: Oriflame shipping a
 * product short is a weekly event, and the total has to follow immediately.
 */
import { Trash2 } from 'lucide-react'
import type { OrderItem } from '../../db/types'
import { fromCents, itemCents } from '../../domain'
import { Card, formatMoney, Money, Stepper } from '../../ui'

export interface ItemCardProps {
  item: OrderItem
  onQuantityChange: (quantity: number) => void
  onPriceClick: () => void
  onRemove: () => void
}

export function ItemCard({ item, onQuantityChange, onPriceClick, onRemove }: ItemCardProps) {
  const hasPrice = item.price > 0

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 flex-1 text-xl leading-tight font-semibold">{item.name}</span>
        <Money value={fromCents(itemCents(item))} size="lg" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Stepper value={item.quantity} onChange={onQuantityChange} label={item.name} />
        <button
          type="button"
          onClick={onPriceClick}
          className={
            hasPrice
              ? 'money flex min-h-12 items-center rounded-xl px-2 text-[1.0625rem] font-semibold text-brand tabular-nums active:bg-brand-soft'
              : 'flex min-h-12 items-center rounded-xl px-2 text-[1.0625rem] font-bold text-owes active:bg-brand-soft'
          }
        >
          {hasPrice ? `${formatMoney(item.price)} c/u` : 'Falta el precio'}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${item.name}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-muted active:bg-owes-soft"
        >
          <Trash2 size={22} aria-hidden="true" />
        </button>
      </div>
    </Card>
  )
}

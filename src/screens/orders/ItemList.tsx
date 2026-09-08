import { Trash2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { OrderItem } from '../../db/types'
import { fromCents, itemCents, normalizeName, toCents } from '../../domain'
import { Card, cx, formatMoney, Money, Stepper } from '../../ui'

export interface PendingItem {
  name: string
  price: number
  /** How many are being added on top of whatever the order already has. */
  quantity: number
}

export interface ItemListProps {
  items: readonly OrderItem[]
  /** Extra money on top of the lines. Shown only when there is some. */
  shipping?: number
  /** The one being picked right now, not saved yet. Capture only. */
  pending?: PendingItem
  /** On the order screen every line is editable; during a live they are not. */
  onQuantityChange?: (index: number, quantity: number) => void
  onPriceClick?: (item: OrderItem) => void
  onRemove: (index: number) => void
  onPendingQuantityChange?: (quantity: number) => void
  onDiscardPending?: () => void
}

/**
 * The lines of an order and what they add up to, as one card.
 *
 * Both screens that show an order use this. They used to have a card per item
 * with the stepper and the bin on a row of their own, which made a five-item
 * order read as five unrelated things and put every amount at a different
 * distance from the edge. One card, one column of money, one total.
 *
 * A product being picked that is already in the order does not get a second
 * row: it takes over its own, and the stepper shows the quantity it will end
 * up at, so the same code is never on screen twice.
 */
export function ItemList({
  items,
  shipping = 0,
  pending,
  onQuantityChange,
  onPriceClick,
  onRemove,
  onPendingQuantityChange,
  onDiscardPending,
}: ItemListProps) {
  const pendingKey = pending ? normalizeName(pending.name) : undefined
  const mergeIndex = items.findIndex((item) => normalizeName(item.name) === pendingKey)

  let cents = toCents(shipping)
  for (const item of items) cents += itemCents(item)
  if (pending) cents += toCents(pending.price) * pending.quantity

  return (
    <Card padded={false}>
      {/* Capped so a long order never pushes the button off the screen. */}
      <div className="max-h-[46dvh] overflow-y-auto overscroll-contain">
        {items.map((item, index) =>
          pending && index === mergeIndex ? (
            <Line
              key={`${item.name}-${index}`}
              name={item.name}
              // The stored price wins; the picked one only fills a gap.
              price={item.price > 0 ? item.price : pending.price}
              quantity={item.quantity + pending.quantity}
              minQuantity={item.quantity + 1}
              hideQuantityInUnit
              pending
              onQuantityChange={(next) => onPendingQuantityChange?.(next - item.quantity)}
              onRemove={onDiscardPending}
            />
          ) : (
            <Line
              key={`${item.name}-${index}`}
              name={item.name}
              price={item.price}
              quantity={item.quantity}
              minQuantity={1}
              onQuantityChange={
                onQuantityChange ? (next) => onQuantityChange(index, next) : undefined
              }
              onPriceClick={onPriceClick ? () => onPriceClick(item) : undefined}
              onRemove={() => onRemove(index)}
            />
          ),
        )}

        {pending && mergeIndex === -1 && (
          <Line
            name={pending.name}
            price={pending.price}
            quantity={pending.quantity}
            minQuantity={1}
            hideQuantityInUnit
            pending
            onQuantityChange={onPendingQuantityChange}
            onRemove={onDiscardPending}
          />
        )}
      </div>

      {/* Only when there is one, so the lines above always add up to the total. */}
      {shipping > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="text-[0.9375rem] font-medium text-muted">Envío</span>
          <TrailingCell>
            <span className="money text-[1.0625rem] font-semibold tabular-nums">
              {formatMoney(shipping)}
            </span>
          </TrailingCell>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-[0.9375rem] font-semibold tracking-wide text-muted uppercase">
          Total
        </span>
        <TrailingCell>
          <Money value={fromCents(cents)} size="lg" />
        </TrailingCell>
      </div>
    </Card>
  )
}

interface LineProps {
  name: string
  price: number
  quantity: number
  minQuantity: number
  /** The stepper beside it already says the count, so the unit line drops it. */
  hideQuantityInUnit?: boolean
  /** Tinted: picked but not written down yet. */
  pending?: boolean
  onQuantityChange?: (quantity: number) => void
  onPriceClick?: () => void
  onRemove?: () => void
}

function Line({
  name,
  price,
  quantity,
  minQuantity,
  hideQuantityInUnit,
  pending,
  onQuantityChange,
  onPriceClick,
  onRemove,
}: LineProps) {
  const unit = <UnitPrice price={price} quantity={hideQuantityInUnit ? undefined : quantity} />

  return (
    <div className={cx('border-b border-line px-4 py-2.5', pending && 'bg-brand-tint')}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={cx(
            'min-w-0 text-[1.0625rem] leading-snug',
            pending ? 'font-semibold' : 'font-medium',
          )}
        >
          {name}
        </span>

        <TrailingCell
          action={
            onRemove && (
              <button
                type="button"
                onClick={onRemove}
                aria-label={pending ? `Descartar ${name}` : `Quitar ${name} del pedido`}
                className={cx(
                  // The negative margin keeps the 48px target — it just spills
                  // into the row's padding instead of making the name 44px tall.
                  '-my-2 flex h-11 w-11 items-center justify-center rounded-full text-muted',
                  pending ? 'active:bg-brand-soft' : 'active:bg-owes-soft',
                )}
              >
                {pending ? <X size={20} aria-hidden="true" /> : <Trash2 size={20} aria-hidden="true" />}
              </button>
            )
          }
        >
          <span className="money shrink-0 text-[1.1875rem] font-bold tracking-tight tabular-nums">
            {formatMoney(fromCents(toCents(price) * quantity))}
          </span>
        </TrailingCell>
      </div>

      {/*
        The stepper shares this row with the unit price instead of owning one:
        the two of them are what the amount above is made of, and a row per
        stepper turned a two-item order into a screenful. No "Cantidad" label
        either — a stepper next to a price is already the count.
      */}
      <div className="mt-0.5 flex items-center justify-between gap-3">
        {onPriceClick ? (
          <button
            type="button"
            onClick={onPriceClick}
            aria-label={`Cambiar el precio de ${name}`}
            className="-mx-2 inline-flex min-h-9 items-center rounded-full px-2 active:bg-brand-soft"
          >
            {unit}
          </button>
        ) : (
          unit
        )}

        {onQuantityChange && (
          <TrailingCell>
            <Stepper
              value={quantity}
              min={minQuantity}
              size="sm"
              label={name}
              onChange={onQuantityChange}
            />
          </TrailingCell>
        )}
      </div>
    </div>
  )
}

/**
 * The right-hand column: a value, a hairline, and the row's action.
 *
 * Every row renders this, the total included. Without the action the divider
 * and the button turn into a spacer of exactly their own width, which is what
 * keeps every amount on the card sitting in one straight column instead of
 * each row ending wherever its own controls happen to stop.
 */
function TrailingCell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <span className="flex shrink-0 items-center gap-3">
      {children}
      <span aria-hidden="true" className={cx('h-6 w-px', action ? 'bg-ink/10' : 'bg-transparent')} />
      {action ?? <span aria-hidden="true" className="w-11" />}
    </span>
  )
}

/** "2 × $12.90", or "× $12.90" when a stepper below owns the count. */
function UnitPrice({ price, quantity }: { price: number; quantity?: number }) {
  if (price <= 0) {
    // Skipping the price mid-live is allowed on purpose, so the gap has to be
    // visible here rather than discovered at payment.
    return (
      <span className="text-[0.9375rem] font-semibold text-pending-ink">
        {quantity === undefined ? 'sin precio' : `${quantity} × sin precio`}
      </span>
    )
  }
  return (
    <span className="money text-[0.9375rem] text-muted tabular-nums">
      {quantity === undefined ? '' : `${quantity} `}× {formatMoney(price)}
    </span>
  )
}

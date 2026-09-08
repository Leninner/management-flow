import { Trash2 } from 'lucide-react'
import type { Order } from '../../db/types'
import { fromCents, itemCents, orderSubtotal, orderTotal } from '../../domain'
import { Card, formatMoney, Money } from '../../ui'

export interface OrderCardProps {
  order: Order
  onRemoveItem: (index: number) => void
}

/**
 * The order as it stands, read straight from Dexie.
 *
 * This used to be two lists that described the same thing: an aggregate row
 * saying how much the customer already carried, and a session-local log of
 * what had been taken down in this live. Neither showed a unit price or a line
 * total, so the one question the screen exists to answer — what does this cost
 * and what does it add up to — was not on it. One list, straight off the
 * order, has no second copy to disagree with.
 */
export function OrderCard({ order, onRemoveItem }: OrderCardProps) {
  const shipping = orderTotal(order) - orderSubtotal(order)

  return (
    <Card padded={false}>
      {/* Capped so a long order never pushes the button off the screen. */}
      <div className="max-h-[42dvh] overflow-y-auto overscroll-contain">
        {order.items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="border-b border-line px-4 py-3">
            {/*
              The name gets the whole line and wraps rather than truncating:
              "38588 Novage Ecolla…" hides the Oriflame code, which is the half
              she actually matches against the catalogue.
            */}
            <div className="flex items-start gap-2">
              <span className="min-w-0 flex-1 text-[1.0625rem] leading-snug font-medium">
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => onRemoveItem(index)}
                aria-label={`Quitar ${item.name}`}
                className="-mt-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-owes-soft"
              >
                <Trash2 size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Unit price and line total on one line, so they read together. */}
            <div className="mt-0.5 flex items-baseline justify-between gap-3">
              {item.price > 0 ? (
                <span className="money text-[0.9375rem] text-muted tabular-nums">
                  {item.quantity} × {formatMoney(item.price)}
                </span>
              ) : (
                // Skipping the price mid-live is allowed on purpose, so the
                // gap has to be visible here rather than discovered at payment.
                <span className="text-[0.9375rem] font-semibold text-pending-ink">
                  {item.quantity} × sin precio
                </span>
              )}
              <span className="money shrink-0 text-[1.1875rem] font-bold tracking-tight tabular-nums">
                {formatMoney(fromCents(itemCents(item)))}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Only when there is one, so the lines above always add up to the total. */}
      {shipping > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="text-[0.9375rem] font-medium text-muted">Envío</span>
          <span className="money text-[1.0625rem] font-semibold tabular-nums">
            {formatMoney(shipping)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-[0.9375rem] font-semibold tracking-wide text-muted uppercase">
          Total
        </span>
        <Money value={orderTotal(order)} size="lg" />
      </div>
    </Card>
  )
}

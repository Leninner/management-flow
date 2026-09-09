/**
 * A pedido drawn as what it is: a sheet that gets filled in.
 *
 * Heading, one line per product, a rule, and the totals at the foot. The shape
 * says what the screen is before she reads a word, and it is the same shape
 * while she is writing it during a live and afterwards when she settles it.
 */
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { OrderItem } from '../../db/types'
import { fromCents, itemCents, productKey } from '../../domain'
import { Card, cx, formatMoney, type Status } from '../../ui'
import { STATUS_TEXT } from '../../ui/status'

/**
 * "38588 Novage Ecollagen", with the code in the brand colour so she can pick
 * it out of the line at a glance -- it is the half Oriflame asks for. A product
 * whose name she has not written yet is just its code, printed once.
 */
export function ProductLabel({ item }: { item: { code?: string; name: string } }) {
  if (!item.code) return <>{item.name}</>
  return (
    <>
      <span className="money font-bold text-brand">{item.code}</span>
      {item.name !== item.code && ` ${item.name}`}
    </>
  )
}

export function InvoiceSheet({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <Card padded={false}>
      <div className="flex items-baseline justify-between gap-3 px-[1.125rem] pt-[1.125rem] pb-3.5">
        <span className="min-w-0 truncate text-[1.375rem] leading-tight font-bold tracking-tight">
          {title}
        </span>
        {subtitle && (
          <span className="shrink-0 text-[0.875rem] text-muted">{subtitle}</span>
        )}
      </div>
      {children}
    </Card>
  )
}

export interface InvoiceLinesProps {
  items: readonly OrderItem[]
  /** Left out during a live: nothing on this screen edits an old line. */
  onPriceClick?: (item: OrderItem) => void
  onRemove?: (index: number) => void
  emptyLine?: string
}

export function InvoiceLines({ items, onPriceClick, onRemove, emptyLine }: InvoiceLinesProps) {
  if (items.length === 0) {
    return (
      <div className="border-t border-line px-[1.125rem] py-6">
        <span className="text-muted">{emptyLine ?? 'Sin renglones todavía'}</span>
      </div>
    )
  }

  return (
    <>
      {items.map((item, index) => (
        <div
          key={`${productKey(item)}-${index}`}
          className="flex items-start gap-2.5 border-t border-line py-3 pr-2 pl-[1.125rem]"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate leading-snug">
              <ProductLabel item={item} />
            </span>
            <UnitLine item={item} onClick={onPriceClick ? () => onPriceClick(item) : undefined} />
          </span>
          <span
            className={cx(
              'money shrink-0 pt-px text-[1.0625rem] font-bold tabular-nums',
              item.price === undefined && 'text-pending-ink',
            )}
          >
            {item.price === undefined ? '—' : formatMoney(fromCents(itemCents(item)))}
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Quitar ${item.name}`}
              className="-mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted/45 active:bg-owes-soft"
            >
              <X size={19} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
    </>
  )
}

/** "2 × $9.90", or the gap said out loud so it is never discovered at payment. */
function UnitLine({ item, onClick }: { item: OrderItem; onClick?: () => void }) {
  const text =
    item.price === undefined
      ? `${item.quantity} × sin precio`
      : `${item.quantity} × ${formatMoney(item.price)}`
  const classes = cx(
    'money mt-0.5 block text-[0.875rem] tabular-nums',
    item.price === undefined ? 'text-pending-ink' : 'text-muted',
  )

  if (!onClick) return <span className={classes}>{text}</span>
  return (
    <button type="button" onClick={onClick} className={cx(classes, 'text-left')}>
      {text}
    </button>
  )
}

export interface TotalRow {
  label: string
  value: number
}

/**
 * The foot of the sheet. The rule above it is ink, not the hairline used
 * between lines: it is the one place where the reading changes from "what she
 * wrote down" to "what it comes to".
 */
export function InvoiceTotals({
  rows,
  label,
  value,
  tone,
  note,
}: {
  rows?: readonly TotalRow[]
  label: string
  value: number
  tone?: Status
  note?: string
}) {
  return (
    <div className="border-t border-ink px-[1.125rem] pt-3.5 pb-1">
      {rows?.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3 pb-2">
          <span className="text-[0.9375rem] text-muted">{row.label}</span>
          <span className="money text-[1.0625rem] font-semibold tabular-nums">
            {formatMoney(row.value)}
          </span>
        </div>
      ))}
      <div
        className={cx(
          'flex items-baseline justify-between gap-3 py-3',
          rows && rows.length > 0 && 'border-t border-line',
        )}
      >
        <span className="text-[0.9375rem] font-semibold tracking-wide text-muted uppercase">
          {label}
        </span>
        <span
          className={cx(
            'money text-[1.875rem] font-bold tracking-tight tabular-nums',
            tone && STATUS_TEXT[tone],
          )}
        >
          {formatMoney(value)}
        </span>
      </div>
      {note && <span className="block pb-3 text-[0.875rem] text-pending-ink">{note}</span>}
    </div>
  )
}

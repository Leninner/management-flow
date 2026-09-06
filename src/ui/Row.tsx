import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from './Card'
import { CountBadge } from './CountBadge'
import { cx } from './cx'
import { Money } from './Money'
import { StatusDot } from './StatusDot'
import type { Status } from './status'

export interface RowProps {
  /** The colour on the left edge. Leave out while the row has no state. */
  status?: Status
  /** Shown on the left when there is no status. Ignored when there is one. */
  icon?: LucideIcon
  /** The person, or whatever the row is about. Second biggest thing here. */
  title: string
  /** One short supporting line. Never a sentence. */
  subtitle?: ReactNode
  /** Biggest thing in the row, right aligned, tinted by status. */
  amount?: number
  /** How many. Big on its own, a badge when there is also an amount. */
  count?: number
  /** Replaces the chevron. A pill, an icon, a small control. */
  trailing?: ReactNode
  /**
   * Buttons on a second line inside the same card, so they never nest inside
   * the tappable area of the row.
   */
  actions?: ReactNode
  onClick?: () => void
  className?: string
}

export function Row({
  status,
  icon: Icon,
  title,
  subtitle,
  amount,
  count,
  trailing,
  actions,
  onClick,
  className,
}: RowProps) {
  const showCountBig = count !== undefined && amount === undefined
  const showCountBadge = count !== undefined && amount !== undefined

  const body = (
    <>
      {!status && Icon ? (
        <Icon size={24} className="shrink-0 text-muted" aria-hidden="true" />
      ) : (
        <StatusDot status={status} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xl leading-tight font-semibold">{title}</span>
        {subtitle && (
          <span className="mt-1 block truncate text-[0.9375rem] leading-tight text-muted">
            {subtitle}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {showCountBadge && <CountBadge count={count} tone={status} />}
        {amount !== undefined && <Money value={amount} size="lg" tone={status} />}
        {showCountBig && (
          <span className="money text-[1.75rem] leading-none font-bold tabular-nums">{count}</span>
        )}
        {trailing ?? (onClick && <ChevronRight size={22} className="text-muted" aria-hidden="true" />)}
      </span>
    </>
  )

  return (
    <Card padded={false} className={className}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex min-h-18 w-full items-center gap-3 px-4 py-3 text-left active:bg-brand-soft"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-18 w-full items-center gap-3 px-4 py-3">{body}</div>
      )}

      {actions && (
        <div className="flex gap-2 border-t border-line px-3 py-2">{actions}</div>
      )}
    </Card>
  )
}

/** A small button meant for the actions strip of a Row. Still 48px tall. */
export function RowAction({
  children,
  onClick,
  icon: Icon,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  icon?: LucideIcon
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3',
        'text-[1.0625rem] font-semibold text-brand active:bg-brand-soft',
        className,
      )}
    >
      {Icon && <Icon size={20} aria-hidden="true" />}
      {children}
    </button>
  )
}

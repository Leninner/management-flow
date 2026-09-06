import { cx } from './cx'
import { STATUS_INK, STATUS_SOFT, type Status } from './status'

export interface CountBadgeProps {
  count: number
  /** Tints the badge by state. Omit for the neutral plum badge. */
  tone?: Status
  /** alert is the solid red badge used to demand attention. */
  variant?: 'soft' | 'alert'
  className?: string
}

export function CountBadge({ count, tone, variant = 'soft', className }: CountBadgeProps) {
  const fill =
    variant === 'alert'
      ? 'bg-owes text-white'
      : tone
        ? cx(STATUS_SOFT[tone], STATUS_INK[tone])
        : 'bg-brand-soft text-brand'

  return (
    <span
      className={cx(
        'money inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[0.9375rem] font-bold tabular-nums',
        fill,
        className,
      )}
    >
      {count}
    </span>
  )
}

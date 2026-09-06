import { cx } from './cx'
import { STATUS_INK, STATUS_LABEL, STATUS_SOFT, STATUS_SOLID, type Status } from './status'

export interface StatusPillProps {
  status: Status
  /** Overrides the default word. Keep it to two words at most. */
  label?: string
  className?: string
}

/**
 * The tinted fill carries the state; the ink text keeps it readable in sun.
 * Saturated amber or green text would fail contrast at this size.
 */
export function StatusPill({ status, label, className }: StatusPillProps) {
  return (
    <span
      className={cx(
        'inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-[0.9375rem] font-bold',
        STATUS_SOFT[status],
        STATUS_INK[status],
        className,
      )}
    >
      <span aria-hidden="true" className={cx('h-2.5 w-2.5 rounded-full', STATUS_SOLID[status])} />
      {label ?? STATUS_LABEL[status]}
    </span>
  )
}

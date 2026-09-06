import { cx } from './cx'
import { STATUS_LABEL, STATUS_SOLID, type Status } from './status'

export interface StatusDotProps {
  /** Left out on rows that have no state yet. Keeps the same footprint. */
  status?: Status
  size?: 'md' | 'lg'
  className?: string
}

const SIZE = {
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
} as const

export function StatusDot({ status, size = 'lg', className }: StatusDotProps) {
  if (!status) {
    return (
      <span
        aria-hidden="true"
        className={cx('shrink-0 rounded-full border-2 border-line', SIZE[size], className)}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={STATUS_LABEL[status]}
      className={cx('shrink-0 rounded-full', SIZE[size], STATUS_SOLID[status], className)}
    />
  )
}

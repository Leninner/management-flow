import type { LucideIcon } from 'lucide-react'
import { BigButton } from './BigButton'
import { cx } from './cx'

export interface EmptyStateProps {
  icon: LucideIcon
  /** One short line. If it needs two, the screen is wrong. */
  line: string
  actionLabel?: string
  onAction?: () => void
  /**
   * For an empty list that lives inside a screen with other content. The full
   * size version is for a screen that is empty on its own; used inside one, it
   * pushes everything below it off the phone.
   */
  compact?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon,
  line,
  actionLabel,
  onAction,
  compact,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center text-center',
        compact ? 'gap-2.5 px-6 py-7' : 'gap-5 px-6 py-16',
        className,
      )}
    >
      <span
        className={cx(
          'flex items-center justify-center rounded-full bg-brand-soft text-brand',
          compact ? 'h-12 w-12' : 'h-20 w-20',
        )}
      >
        <Icon size={compact ? 22 : 36} aria-hidden="true" />
      </span>
      <p
        className={cx(
          'text-balance',
          compact ? 'text-[1.0625rem] font-medium text-muted' : 'text-xl font-semibold',
        )}
      >
        {line}
      </p>
      {actionLabel && onAction && (
        <div className="w-full max-w-xs">
          <BigButton floating={false} onClick={onAction}>
            {actionLabel}
          </BigButton>
        </div>
      )}
    </div>
  )
}

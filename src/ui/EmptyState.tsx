import type { LucideIcon } from 'lucide-react'
import { BigButton } from './BigButton'
import { cx } from './cx'

export interface EmptyStateProps {
  icon: LucideIcon
  /** One short line. If it needs two, the screen is wrong. */
  line: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ icon: Icon, line, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center gap-5 px-6 py-16 text-center', className)}>
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon size={36} aria-hidden="true" />
      </span>
      <p className="text-xl font-semibold text-balance">{line}</p>
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

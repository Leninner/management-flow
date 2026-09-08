import type { ReactNode } from 'react'
import { CountBadge } from './CountBadge'
import { cx } from './cx'

export interface SectionHeaderProps {
  title: string
  /** Rendered as a badge next to the title, the way "HOY (4)" reads. */
  count?: number
  /** A single small control on the right. Never a paragraph. */
  action?: ReactNode
  className?: string
}

export function SectionHeader({ title, count, action, className }: SectionHeaderProps) {
  return (
    <div className={cx('flex items-center gap-2 px-1 pt-7 pb-2.5', className)}>
      <h2 className="text-[0.9375rem] font-semibold text-muted">{title}</h2>
      {count !== undefined && <CountBadge count={count} />}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

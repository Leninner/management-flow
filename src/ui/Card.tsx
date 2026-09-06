import type { ReactNode } from 'react'
import { cx } from './cx'

export interface CardProps {
  children: ReactNode
  /** Turn off to let a child own the padding, the way Row does. */
  padded?: boolean
  className?: string
}

export function Card({ children, padded = true, className }: CardProps) {
  return (
    <div
      className={cx(
        'overflow-hidden rounded-card border border-line bg-card shadow-[0_1px_2px_rgba(28,25,23,0.05)]',
        padded && 'p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

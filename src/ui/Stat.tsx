import type { ReactNode } from 'react'
import { cx } from './cx'
import { STATUS_SOLID, type Status } from './status'

export interface StatProps {
  /** Two or three words, small. The number is what she reads. */
  label: string
  /** A `Money`, a count, or a short phrase like "en 8 días". */
  value: ReactNode
  /** A coloured dot next to the label. The state, in the smallest dose. */
  tone?: Status
  /**
   * Nothing to say: zero, or no data configured behind it. The number goes
   * grey and drops every state colour, so four tiles are never four alarms.
   */
  muted?: boolean
  onClick?: () => void
  className?: string
}

/**
 * One number, big, over one label, small. The first visual law of the app was
 * a convention repeated by hand on every screen; this is it as a component.
 */
export function Stat({ label, value, tone, muted, onClick, className }: StatProps) {
  const body = (
    <>
      <span className="flex items-start gap-1.5">
        {tone && !muted && (
          <span
            aria-hidden="true"
            className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', STATUS_SOLID[tone])}
          />
        )}
        {/* Wraps rather than truncates: "Falta recuperar" cut to "Falta
            recuper…" tells her nothing, and a two-line label costs one row of
            height that the grid gives to both tiles at once. */}
        <span className="text-[0.8125rem] leading-tight font-semibold tracking-wide text-muted uppercase">
          {label}
        </span>
      </span>
      <span className={cx('mt-2 block', muted && 'text-muted')}>{value}</span>
    </>
  )

  const shell = cx(
    'flex min-h-[5.75rem] flex-col justify-center rounded-card border border-line bg-card px-4 py-3.5 text-left',
    className,
  )

  if (!onClick) return <div className={shell}>{body}</div>

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        shell,
        'transition-colors duration-150 ease-smooth active:bg-brand-soft motion-reduce:transition-none',
      )}
    >
      {body}
    </button>
  )
}

/** Two columns. Four of these answer the money questions without scrolling. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

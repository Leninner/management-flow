import { cx } from './cx'
import { STATUS_TEXT, type Status } from './status'

const DECIMALS = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Always "$1,234.50": the dollar sign, a thousands separator and exactly two
 * decimals. Fixed decimals are what makes a column of amounts line up under
 * tabular figures, so whole numbers keep their ".00".
 */
export function formatMoney(value: number): string {
  const amount = Number.isFinite(value) ? value : 0
  const sign = amount < 0 ? '-' : ''
  return `${sign}$${DECIMALS.format(Math.abs(amount))}`
}

export type MoneySize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE: Record<MoneySize, string> = {
  sm: 'text-[0.9375rem] font-semibold leading-tight',
  md: 'text-[1.0625rem] font-semibold leading-tight',
  lg: 'text-[1.75rem] font-bold leading-none',
  xl: 'text-[2.25rem] font-bold leading-none',
}

export interface MoneyProps {
  value: number
  /** lg is the amount in a row. xl is the headline number of a screen. */
  size?: MoneySize
  /** Colours the amount by state. */
  tone?: Status
  className?: string
}

export function Money({ value, size = 'md', tone, className }: MoneyProps) {
  // Amber and green only clear AA contrast as large text, so the tone is
  // dropped on the small sizes. Red is readable at any size.
  const isLarge = size === 'lg' || size === 'xl'
  const toneClass = tone && (isLarge || tone === 'owes') ? STATUS_TEXT[tone] : undefined

  return (
    <span className={cx('money tracking-tight tabular-nums', SIZE[size], toneClass, className)}>
      {formatMoney(value)}
    </span>
  )
}

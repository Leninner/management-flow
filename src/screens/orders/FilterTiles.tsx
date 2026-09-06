/**
 * The filter of the order list: four tiles, always on screen, one tap each.
 *
 * A row of chips would not fit four Spanish labels on a phone and would have
 * to scroll, which is a second gesture. As tiles they also answer "cuántos"
 * for the three states she is not looking at.
 */
import { cx } from '../../ui'
import { ORDER_FILTERS, type OrderFilter } from './filters'

export interface FilterTilesProps {
  value: OrderFilter
  counts: Record<OrderFilter, number>
  onChange: (filter: OrderFilter) => void
}

export function FilterTiles({ value, counts, onChange }: FilterTilesProps) {
  return (
    <div className="grid grid-cols-2 gap-2 pt-4">
      {ORDER_FILTERS.map((option) => {
        const active = option.key === value
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key)}
            className={cx(
              'flex min-h-18 flex-col justify-center gap-0.5 rounded-2xl px-4 py-2 text-left',
              active
                ? 'bg-brand text-white'
                : 'border border-line bg-card text-ink active:bg-brand-soft',
            )}
          >
            <span className="money text-[1.75rem] leading-none font-bold tabular-nums">
              {counts[option.key]}
            </span>
            <span className={cx('text-[0.9375rem] font-semibold', !active && 'text-muted')}>
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

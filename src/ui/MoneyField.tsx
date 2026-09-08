import type { KeyboardEvent } from 'react'
import { Field, type FieldProps } from './Field'

export interface MoneyFieldProps extends Pick<FieldProps, 'label' | 'error' | 'className'> {
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
  onSubmit?: () => void
}

/**
 * An amount, big enough to read while she is typing it. The input is kept as
 * text rather than a number: a number input drops the leading zero, fights the
 * decimal separator on a Spanish keyboard, and shows spinners nobody wants.
 */
export function MoneyField({
  label,
  error,
  className,
  value,
  onChange,
  autoFocus,
  onSubmit,
}: MoneyFieldProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSubmit?.()
  }

  return (
    <Field label={label} error={error} size="lg" className={className}>
      <span aria-hidden="true" className="money text-[1.75rem] font-bold text-muted">
        $
      </span>
      <input
        type="text"
        value={value}
        autoFocus={autoFocus}
        inputMode="decimal"
        enterKeyHint={onSubmit ? 'done' : undefined}
        // Only digits and one separator: a stray letter would silently turn
        // the amount into NaN and a NaN is money that disappears.
        onChange={(event) => onChange(sanitizeAmount(event.target.value))}
        onKeyDown={handleKeyDown}
        placeholder="0.00"
        autoComplete="off"
        className="money min-w-0 flex-1 bg-transparent px-2 text-[2rem] font-bold text-ink tabular-nums outline-none placeholder:text-line"
      />
    </Field>
  )
}

/** Digits and at most two decimals. Anything else never reaches the state. */
export function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/,/g, '.')
  const [whole, ...rest] = cleaned.split('.')
  if (rest.length === 0) return whole ?? ''
  return `${whole ?? ''}.${rest.join('').slice(0, 2)}`
}

/** Undefined when there is no usable number, so callers can disable the button. */
export function parseAmount(raw: string): number | undefined {
  const text = raw.trim()
  if (text === '') return undefined
  const value = Number(text.replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

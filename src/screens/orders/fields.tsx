/**
 * The two inputs the primitives do not cover: a line of text and an amount.
 * Both are built out of the same tokens as the rest of the app, both keep the
 * 48px target, and the amount is big enough to read while she is typing it.
 */
import type { KeyboardEvent } from 'react'
import { cx } from '../../ui'

const LABEL = 'block px-1 pb-2 text-[0.9375rem] font-semibold text-muted'
const BOX = 'flex items-center rounded-field border-2 border-line bg-card focus-within:border-brand'

export interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  inputMode?: 'text' | 'tel'
  /** Fired on Enter, so a one-field form never needs a second tap. */
  onSubmit?: () => void
  className?: string
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  inputMode = 'text',
  onSubmit,
  className,
}: TextFieldProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSubmit?.()
  }

  return (
    <label className={cx('block', className)}>
      <span className={LABEL}>{label}</span>
      <span className={cx(BOX, 'min-h-14 px-4')}>
        <input
          type="text"
          value={value}
          autoFocus={autoFocus}
          inputMode={inputMode}
          enterKeyHint={onSubmit ? 'done' : undefined}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-[1.1875rem] outline-none placeholder:text-muted"
        />
      </span>
    </label>
  )
}

export interface AmountFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
  onSubmit?: () => void
}

export function AmountField({ label, value, onChange, autoFocus, onSubmit }: AmountFieldProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSubmit?.()
  }

  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <span className={cx(BOX, 'min-h-16 px-4')}>
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
          className="money min-w-0 flex-1 bg-transparent px-2 text-[2rem] font-bold tabular-nums outline-none placeholder:text-line"
        />
      </span>
    </label>
  )
}

function sanitizeAmount(raw: string): string {
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

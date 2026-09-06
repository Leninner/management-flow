import type { InputHTMLAttributes, KeyboardEvent } from 'react'
import { cx } from '../../ui'

export interface TextFieldProps {
  /** Two or three words. It is a question or a noun, never an explanation. */
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'date'
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  autoFocus?: boolean
  onSubmit?: () => void
  className?: string
}

/**
 * A labelled input, 56px tall like every other target in the app. Lives here
 * until src/ui grows a real primitive; both screens that ask for typed text
 * use this one so they cannot drift apart.
 */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoFocus,
  onSubmit,
  className,
}: TextFieldProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSubmit?.()
  }

  return (
    <label className={cx('block', className)}>
      <span className="mb-2 block text-[0.9375rem] font-semibold text-muted">{label}</span>
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        // Live capture opens straight into typing.
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        enterKeyHint={onSubmit ? 'done' : undefined}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        spellCheck={false}
        className="min-h-14 w-full rounded-2xl border border-line bg-card px-4 text-[1.1875rem] text-ink outline-none placeholder:text-muted focus:border-brand"
      />
    </label>
  )
}

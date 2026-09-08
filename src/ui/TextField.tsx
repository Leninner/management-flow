import type { InputHTMLAttributes, KeyboardEvent, Ref } from 'react'
import { Field, type FieldProps } from './Field'

export interface TextFieldProps extends Pick<FieldProps, 'label' | 'error' | 'className'> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'tel' | 'date'
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  /** Live capture opens straight into typing. */
  autoFocus?: boolean
  /** Fired on Enter, so a one-field form never needs a second tap. */
  onSubmit?: () => void
  ref?: Ref<HTMLInputElement>
}

/**
 * The only text input in the app. It replaced three near-identical copies that
 * had drifted apart in three screen folders.
 */
export function TextField({
  label,
  error,
  className,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoFocus,
  onSubmit,
  ref,
}: TextFieldProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSubmit?.()
  }

  return (
    <Field label={label} error={error} className={className}>
      <input
        ref={ref}
        type={type}
        value={value}
        inputMode={inputMode}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        enterKeyHint={onSubmit ? 'done' : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent text-[1.1875rem] text-ink outline-none placeholder:text-muted"
      />
    </Field>
  )
}

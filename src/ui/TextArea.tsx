import type { Ref } from 'react'
import { cx } from './cx'
import { Field, type FieldProps } from './Field'

export interface TextAreaProps extends Pick<FieldProps, 'label' | 'error' | 'className'> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  /** Read out to screen readers when the surrounding sheet already has a title. */
  ariaLabel?: string
  ref?: Ref<HTMLTextAreaElement>
}

/** Several lines of her own words. The only place the app is not the author. */
export function TextArea({
  label,
  error,
  className,
  value,
  onChange,
  placeholder,
  rows = 7,
  ariaLabel,
  ref,
}: TextAreaProps) {
  return (
    <Field label={label} error={error} boxed={false} className={className}>
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={cx(
          'w-full resize-none rounded-field border border-transparent bg-fill p-4',
          'text-[1.1875rem] leading-snug text-ink outline-none placeholder:text-muted',
          'transition-colors duration-150 ease-smooth focus:border-brand',
          'motion-reduce:transition-none',
          error && 'border-owes',
        )}
      />
    </Field>
  )
}

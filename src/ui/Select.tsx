import { ChevronDown } from 'lucide-react'
import { Field, type FieldProps } from './Field'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Pick<FieldProps, 'label' | 'error' | 'className'> {
  value: string
  onChange: (value: string) => void
  options: readonly SelectOption[]
  /** Shown as a disabled first option while nothing is chosen. */
  placeholder?: string
}

/**
 * A native `<select>`, styled only in its box.
 *
 * A custom dropdown looks better on a desktop and is worse on the phone: the
 * native one opens the iOS wheel, which she spins with a thumb without having
 * to aim at a row. The list is the operating system's job.
 */
export function Select({
  label,
  error,
  className,
  value,
  onChange,
  options,
  placeholder,
}: SelectProps) {
  return (
    <Field label={label} error={error} className={className}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 appearance-none bg-transparent text-[1.1875rem] text-ink outline-none"
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={22} className="ml-2 shrink-0 text-muted" aria-hidden="true" />
    </Field>
  )
}

/** 1 to 31, for the two dates a credit card has. */
export function dayOfMonthOptions(): SelectOption[] {
  return Array.from({ length: 31 }, (_, index) => {
    const day = String(index + 1)
    return { value: day, label: day }
  })
}

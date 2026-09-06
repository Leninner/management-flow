/**
 * The few form controls the settings tab needs and `src/ui` does not carry,
 * because nowhere else in the app types free text. Same 48px targets, same
 * tokens, same focus ring as SearchField.
 */
import type { ReactNode, Ref } from 'react'
import { Card, cx } from '../../ui'

const FIELD =
  'w-full rounded-2xl border border-line bg-card text-[1.1875rem] text-ink outline-none placeholder:text-muted focus:border-brand'

export function TextField({
  value,
  onChange,
  label,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  type?: 'text' | 'date'
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="px-1 text-[0.9375rem] font-bold tracking-widest text-muted uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        className={cx(FIELD, 'min-h-14 px-4')}
      />
    </label>
  )
}

export function TextArea({
  value,
  onChange,
  label,
  placeholder,
  rows = 7,
  ref,
}: {
  value: string
  onChange: (value: string) => void
  /** Read out to screen readers. The sheet title already says what this is. */
  label: string
  placeholder?: string
  rows?: number
  ref?: Ref<HTMLTextAreaElement>
}) {
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      aria-label={label}
      placeholder={placeholder}
      className={cx(FIELD, 'resize-none p-4 leading-snug')}
    />
  )
}

/** What went wrong, in red, where she is looking. Never a stack trace. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <Card className="bg-owes-soft">
      <p role="alert" className="text-xl leading-tight font-semibold text-ink">
        {children}
      </p>
    </Card>
  )
}

/** A tappable token. Small on purpose: it is a shortcut, not a control. */
export function Chip({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="money inline-flex min-h-11 items-center rounded-full bg-brand-soft px-3.5 text-base font-semibold text-brand active:bg-brand active:text-white"
    >
      {children}
    </button>
  )
}

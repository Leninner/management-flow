import type { ReactNode } from 'react'
import { cx } from './cx'

export type FieldSize = 'md' | 'lg'

const BOX_HEIGHT: Record<FieldSize, string> = {
  md: 'min-h-14',
  lg: 'min-h-16',
}

/**
 * The one input surface of the app: a recessed fill on white paper, with the
 * hairline appearing only on focus. A filled box reads as "type here" faster
 * than an outlined one, and the transparent border keeps the box from growing
 * a pixel the moment she taps it.
 */
export function fieldBox(size: FieldSize = 'md'): string {
  return cx(
    'flex w-full items-center rounded-field border border-transparent bg-fill px-4',
    'transition-colors duration-150 ease-smooth focus-within:border-brand',
    'motion-reduce:transition-none',
    BOX_HEIGHT[size],
  )
}

export interface FieldProps {
  /** Two or three words. A noun or a question, never an explanation. */
  label?: string
  /** What went wrong, where she is looking. Never a stack trace. */
  error?: string
  children: ReactNode
  size?: FieldSize
  /** Off when the child paints its own box, the way TextArea does. */
  boxed?: boolean
  className?: string
}

/**
 * Label, box, error. Every control that the user types or picks into is built
 * on this, so the whole app has one field height, one radius and one focus
 * treatment instead of one per screen.
 */
export function Field({
  label,
  error,
  children,
  size = 'md',
  boxed = true,
  className,
}: FieldProps) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-2 block px-1 text-[0.9375rem] font-medium text-muted">{label}</span>
      )}
      {boxed ? (
        <span className={cx(fieldBox(size), error && 'border-owes')}>{children}</span>
      ) : (
        children
      )}
      {error && (
        <span role="alert" className="mt-1.5 block px-1 text-[0.9375rem] font-medium text-owes">
          {error}
        </span>
      )}
    </label>
  )
}

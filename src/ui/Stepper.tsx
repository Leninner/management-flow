import { Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

export type StepperSize = 'md' | 'sm'

const BUTTON: Record<StepperSize, string> = {
  md: 'h-13 w-13',
  // Still a 48px target, the floor the whole app keeps. Only the drawing
  // shrinks: inside a list of items the big one ate a row per line.
  sm: 'h-12 w-12',
}

// sm drops the grey pill: with it the control was 56px tall and read like a
// second card sitting inside the row. Bare buttons take exactly their target.
const FRAME: Record<StepperSize, string> = {
  md: 'gap-1 rounded-full bg-fill p-1',
  sm: 'gap-0.5',
}

const ICON: Record<StepperSize, number> = { md: 26, sm: 20 }

const VALUE: Record<StepperSize, string> = {
  md: 'min-w-14 text-[1.75rem]',
  sm: 'min-w-9 text-[1.25rem]',
}

export interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /**
   * md is the one she uses without looking down, mid-live. sm is for a row in
   * a list, where the count is a detail of the line and not the point of the
   * screen.
   */
  size?: StepperSize
  /** Read out to screen readers. Nothing is drawn for it. */
  label?: string
  className?: string
}

/** Two round targets and the number between them, never smaller than 48px. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  label = 'Cantidad',
  className,
}: StepperProps) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)))

  return (
    <div className={cx('inline-flex items-center', FRAME[size], className)}>
      <StepButton
        label={`Quitar uno de ${label}`}
        size={size}
        disabled={value <= min}
        onClick={() => step(-1)}
      >
        <Minus size={ICON[size]} aria-hidden="true" />
      </StepButton>
      <output
        aria-label={label}
        className={cx(
          'money px-1 text-center leading-none font-bold tabular-nums',
          VALUE[size],
        )}
      >
        {value}
      </output>
      <StepButton
        label={`Agregar uno a ${label}`}
        size={size}
        disabled={value >= max}
        onClick={() => step(1)}
      >
        <Plus size={ICON[size]} aria-hidden="true" />
      </StepButton>
    </div>
  )
}

function StepButton({
  children,
  label,
  size,
  disabled,
  onClick,
}: {
  children: ReactNode
  label: string
  size: StepperSize
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full border border-line bg-card',
        'text-brand active:bg-brand-soft disabled:opacity-30',
        BUTTON[size],
      )}
    >
      {children}
    </button>
  )
}

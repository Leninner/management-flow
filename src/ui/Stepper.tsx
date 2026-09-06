import { Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

export interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** Read out to screen readers. Nothing is drawn for it. */
  label?: string
  className?: string
}

/**
 * Two 56px targets and a big number between them. Sized to be used without
 * looking down, while she is talking to the camera.
 */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label = 'Cantidad',
  className,
}: StepperProps) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)))

  return (
    <div
      className={cx(
        'inline-flex items-center gap-1 rounded-full bg-brand-tint p-1',
        className,
      )}
    >
      <StepButton label={`Quitar uno de ${label}`} disabled={value <= min} onClick={() => step(-1)}>
        <Minus size={26} aria-hidden="true" />
      </StepButton>
      <output
        aria-label={label}
        className="money min-w-14 px-1 text-center text-[1.75rem] leading-none font-bold tabular-nums"
      >
        {value}
      </output>
      <StepButton label={`Agregar uno a ${label}`} disabled={value >= max} onClick={() => step(1)}>
        <Plus size={26} aria-hidden="true" />
      </StepButton>
    </div>
  )
}

function StepButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-card text-brand shadow-card active:bg-brand-soft disabled:opacity-30"
    >
      {children}
    </button>
  )
}

/**
 * Where the pedido is, and how it moves.
 *
 * The three states used to be a list she had to scroll to, below the money.
 * They are the whole point of opening a pedido, so they sit at the top and
 * each one is its own target: tapping a step is how the state changes, not a
 * button somewhere else that changes it for her.
 */
import { Check, type LucideIcon } from 'lucide-react'
import { Card, cx } from '../../ui'

export interface OrderStep {
  /** One word. It is a state, never a sentence. */
  label: string
  done: boolean
  icon: LucideIcon
  /** Absent when the step cannot be taken, or cannot be taken back. */
  onToggle?: () => void
}

/** Where the green line stops: the last step reached, not how many are done. */
function reached(steps: readonly OrderStep[]): number {
  let count = 0
  for (const step of steps) {
    if (!step.done) break
    count += 1
  }
  return Math.max(0, count - 1)
}

export function OrderSteps({ steps }: { steps: readonly OrderStep[] }) {
  const gaps = Math.max(1, steps.length - 1)
  const span = 100 - 100 / steps.length // edge of the first circle to the last

  return (
    <Card className="px-2 py-4">
      <div
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className="absolute h-[3px] rounded-full bg-line"
          style={{ top: 22.5, left: `${100 / steps.length / 2}%`, width: `${span}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute h-[3px] rounded-full bg-done transition-[width] duration-200 motion-reduce:transition-none"
          style={{
            top: 22.5,
            left: `${100 / steps.length / 2}%`,
            width: `${(reached(steps) / gaps) * span}%`,
          }}
        />

        {steps.map(({ label, done, icon: Icon, onToggle }) => {
          const body = (
            <>
              <span
                className={cx(
                  'flex h-12 w-12 items-center justify-center rounded-full border-[3px] transition-colors',
                  'motion-reduce:transition-none',
                  done ? 'border-done bg-done text-white' : 'border-line bg-card text-muted/60',
                )}
              >
                {done ? (
                  <Check size={24} strokeWidth={3} aria-hidden="true" />
                ) : (
                  <Icon size={22} aria-hidden="true" />
                )}
              </span>
              <span
                className={cx(
                  'text-[0.875rem]',
                  done ? 'font-bold text-ink' : 'font-semibold text-muted',
                )}
              >
                {label}
              </span>
            </>
          )

          const shared = 'relative flex flex-col items-center gap-2 px-1'

          return onToggle ? (
            <button
              key={label}
              type="button"
              onClick={onToggle}
              aria-pressed={done}
              className={cx(shared, 'active:opacity-70')}
            >
              {body}
            </button>
          ) : (
            <span key={label} role="img" aria-label={`${label}: ${done ? 'sí' : 'todavía no'}`} className={shared}>
              {body}
            </span>
          )
        })}
      </div>
    </Card>
  )
}

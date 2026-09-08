/**
 * Where the pedido is, in one line.
 *
 * This says where the pedido is. It does not move it. Advancing happens
 * through the one big button at the bottom, and undoing through the menu.
 *
 * It used to be a card of its own: three 48px circles joined by a progress
 * line, about 115px of screen to report three booleans. On a phone that was
 * enough to push the products -- the part she actually edits -- off the
 * bottom. The line was decoration; the state is the colour. So it is now a
 * strip of chips at the foot of the balance card, and the products start
 * about 150px higher.
 */
import { Check, type LucideIcon } from 'lucide-react'
import { cx } from '../../ui'

export interface OrderStep {
  /** One word. It is a state, never a sentence. */
  label: string
  done: boolean
  icon: LucideIcon
}

export function OrderSteps({ steps }: { steps: readonly OrderStep[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2.5">
      {steps.map(({ label, done, icon: Icon }) => (
        <span
          key={label}
          role="img"
          aria-label={`${label}: ${done ? 'sí' : 'todavía no'}`}
          className={cx(
            'inline-flex items-center gap-1 rounded-full py-1 pr-2.5 pl-2',
            'text-[0.875rem] font-bold transition-colors motion-reduce:transition-none',
            done ? 'bg-done-soft text-done-ink' : 'bg-fill text-muted',
          )}
        >
          {done ? (
            <Check size={16} strokeWidth={3} aria-hidden="true" />
          ) : (
            <Icon size={16} aria-hidden="true" />
          )}
          {label}
        </span>
      ))}
    </div>
  )
}

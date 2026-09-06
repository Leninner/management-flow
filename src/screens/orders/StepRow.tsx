/**
 * The two things that finish a pedido: confirmarlo y entregarlo.
 *
 * What can be undone looks tappable when it is done; what cannot does not.
 * Un-confirming is one tap away because it is cheap to redo, while a delivery
 * has no way back, so once it is marked it stops being a control.
 */
import { Check, Circle, X } from 'lucide-react'
import { cx } from '../../ui'

export interface StepRowProps {
  done: boolean
  label: string
  /** The date it happened, or what is missing. One short line. */
  detail?: string
  /** Absent while there is nothing to do, which is when it is already done. */
  onDo?: () => void
  /** Absent when the step cannot be taken back. */
  onUndo?: () => void
}

export function StepRow({ done, label, detail, onDo, onUndo }: StepRowProps) {
  const body = (
    <>
      {done ? (
        <span
          role="img"
          aria-label="Listo"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-done text-white"
        >
          <Check size={20} strokeWidth={3} aria-hidden="true" />
        </span>
      ) : (
        <Circle size={32} className="shrink-0 text-line" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xl leading-tight font-semibold">{label}</span>
        {detail && (
          <span className="mt-1 block truncate text-[0.9375rem] leading-tight text-muted">
            {detail}
          </span>
        )}
      </span>
    </>
  )

  return (
    <div className="flex items-center">
      {onDo ? (
        <button
          type="button"
          onClick={onDo}
          className="flex min-h-16 flex-1 items-center gap-3 px-4 py-3 text-left active:bg-brand-soft"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-16 flex-1 items-center gap-3 px-4 py-3">{body}</div>
      )}
      {done && onUndo && (
        <button
          type="button"
          onClick={onUndo}
          aria-label={`Quitar ${label}`}
          className={cx(
            'mr-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            'text-muted active:bg-brand-soft',
          )}
        >
          <X size={22} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

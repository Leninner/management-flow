/**
 * The two bits of settings chrome that are not inputs. Every control the tab
 * types into now comes from `src/ui`.
 */
import type { ReactNode } from 'react'
import { Card } from '../../ui'

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
      className="inline-flex min-h-11 items-center rounded-full bg-brand-soft px-4 text-base font-bold text-brand-dark active:bg-brand active:text-white"
    >
      {children}
    </button>
  )
}

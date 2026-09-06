import { Trash2 } from 'lucide-react'
import { Row } from '../../ui'

export interface CaptureEntry {
  /** One line of one order: the same product for the same person adds up. */
  key: string
  orderId: string
  customerId: string
  customerName: string
  itemName: string
  quantity: number
}

/**
 * What she has taken down in this live, newest first, each one gone in a
 * single tap. Without it a mistyped line means leaving the screen to fix it,
 * and leaving the screen mid-live means the next three comments are lost.
 */
export function CapturedList({
  entries,
  onRemove,
}: {
  entries: readonly CaptureEntry[]
  onRemove: (entry: CaptureEntry) => void
}) {
  if (entries.length === 0) return null

  return (
    <div className="mt-2 flex max-h-[42dvh] flex-col gap-2 overflow-y-auto overscroll-contain pb-1">
      {entries.map((entry) => (
        <Row
          key={entry.key}
          title={entry.customerName}
          subtitle={entry.itemName}
          count={entry.quantity}
          trailing={
            <button
              type="button"
              onClick={() => onRemove(entry)}
              aria-label={`Quitar ${entry.itemName} de ${entry.customerName}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-muted active:bg-owes-soft"
            >
              <Trash2 size={22} aria-hidden="true" />
            </button>
          }
        />
      ))}
    </div>
  )
}

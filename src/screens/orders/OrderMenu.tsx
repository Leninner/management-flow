/**
 * The rarely used, dangerous action of a pedido.
 *
 * Borrar used to sit under the products, which meant scrolling past the whole
 * order to reach it and, worse, scrolling past it every time she was looking
 * for something else. Up here it is one tap from anywhere on the screen and
 * still impossible to hit by accident.
 */
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

export function OrderMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Más opciones"
        aria-expanded={open}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-card text-brand active:bg-brand-soft"
      >
        <MoreHorizontal size={24} aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-ink/20"
            />
            <div
              className="absolute right-3 w-60 rounded-card bg-card p-1.5 shadow-pop"
              style={{ top: 'calc(env(safe-area-inset-top) + 60px)' }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onDelete()
                }}
                className="flex min-h-13 w-full items-center gap-3 rounded-2xl px-3 text-left text-[1.0625rem] font-bold text-owes active:bg-owes-soft"
              >
                <Trash2 size={21} aria-hidden="true" />
                Borrar el pedido
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

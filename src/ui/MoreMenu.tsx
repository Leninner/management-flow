/**
 * The rarely used, dangerous actions of a detail screen.
 *
 * Borrar used to sit under the content, which meant scrolling past the whole
 * screen to reach it and, worse, scrolling past it every time she was looking
 * for something else. Up here it is one tap from anywhere on the screen and
 * still impossible to hit by accident.
 */
import { MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

export interface MoreMenuItem {
  label: string
  icon: LucideIcon
  onSelect: () => void
  /**
   * Lo que borra o deshace va en rojo. Las correcciones van en tinta callada,
   * porque ninguna de ellas es a lo que ella entró a la pantalla.
   */
  danger?: boolean
}

export function MoreMenu({ items }: { items: MoreMenuItem[] }) {
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
              {items.map(({ label, icon: Icon, onSelect, danger }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onSelect()
                  }}
                  className={
                    danger
                      ? 'flex min-h-13 w-full items-center gap-3 rounded-2xl px-3 text-left text-[1.0625rem] font-bold text-owes active:bg-owes-soft'
                      : 'flex min-h-13 w-full items-center gap-3 rounded-2xl px-3 text-left text-[1.0625rem] font-semibold text-ink active:bg-brand-soft'
                  }
                >
                  <Icon size={21} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

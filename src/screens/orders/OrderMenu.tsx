/**
 * The rarely used, dangerous action of a pedido.
 *
 * Borrar used to sit under the products, which meant scrolling past the whole
 * order to reach it and, worse, scrolling past it every time she was looking
 * for something else. Up here it is one tap from anywhere on the screen and
 * still impossible to hit by accident.
 */
import { DollarSign, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { createPortal } from 'react-dom'

export interface OrderMenuProps {
  onDelete: () => void
  /** Absent when the pedido is not confirmed yet. */
  onUnconfirm?: () => void
  /**
   * Absent when nothing has been paid in. Abre la hoja del abono, que ya trae
   * el borrado adentro: un pedido cerrado no necesita ese botón ocupando la
   * tarjeta del saldo todos los días.
   */
  onFixPayment?: () => void
}

export function OrderMenu({ onDelete, onUnconfirm, onFixPayment }: OrderMenuProps) {
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
              {onUnconfirm && (
                <MenuItem
                  icon={RotateCcw}
                  onClick={() => {
                    setOpen(false)
                    onUnconfirm()
                  }}
                >
                  Desmarcar confirmado
                </MenuItem>
              )}
              {onFixPayment && (
                <MenuItem
                  icon={DollarSign}
                  onClick={() => {
                    setOpen(false)
                    onFixPayment()
                  }}
                >
                  Corregir el abono
                </MenuItem>
              )}
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

/** A correction. Quiet ink, because none of these is the thing she came for. */
function MenuItem({
  icon: Icon,
  onClick,
  children,
}: {
  icon: LucideIcon
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-13 w-full items-center gap-3 rounded-2xl px-3 text-left text-[1.0625rem] font-semibold text-ink active:bg-brand-soft"
    >
      <Icon size={21} aria-hidden="true" />
      {children}
    </button>
  )
}

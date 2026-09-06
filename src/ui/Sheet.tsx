import { X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './cx'

const DISMISS_DISTANCE = 96

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Pinned under the content, above the safe area. Usually one BigButton. */
  footer?: ReactNode
}

/**
 * Bottom sheet. Two ways out and both are big: drag the top of the sheet down,
 * or hit the close target. Tapping the backdrop works too.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragOrigin = useRef<number | null>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), 180)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!mounted || !open) {
      setEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [mounted, open])

  useEffect(() => {
    if (!mounted) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mounted, onClose])

  if (!mounted) return null

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    dragOrigin.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragOrigin.current === null) return
    setDragY(Math.max(0, event.clientY - dragOrigin.current))
  }

  function endDrag() {
    if (dragOrigin.current === null) return
    dragOrigin.current = null
    if (dragY > DISMISS_DISTANCE) onClose()
    setDragY(0)
  }

  const dragging = dragOrigin.current !== null
  const visible = entered && open

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={onClose}
        className={cx(
          'absolute inset-0 bg-ink/40 transition-opacity duration-200 motion-reduce:transition-none',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl bg-paper shadow-[0_-8px_32px_rgba(28,25,23,0.18)]',
          !dragging && 'transition-transform duration-200 motion-reduce:transition-none',
        )}
        style={{ transform: visible ? `translateY(${dragY}px)` : 'translateY(100%)' }}
      >
        <div
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex touch-none justify-center py-3"
        >
          <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-line" />
        </div>

        <div className="flex min-h-14 items-center gap-2 px-4">
          <h2 className="flex-1 truncate text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink active:bg-brand-soft"
          >
            <X size={26} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">{children}</div>

        {footer && (
          <div
            className="border-t border-line px-4 pt-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

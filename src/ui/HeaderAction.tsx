import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useHeaderSlot } from './AppShell'

/**
 * A control on the right of the title bar, written by the screen that owns it.
 *
 * It exists so a detail screen can put its rarely-used, dangerous actions up
 * there instead of at the bottom of a long scroll. Deleting a pedido used to
 * live under the products; she had to scroll past everything to reach it.
 */
export function HeaderAction({ children }: { children: ReactNode }) {
  const node = useHeaderSlot()
  if (!node) return null
  return createPortal(children, node)
}

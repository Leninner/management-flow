/** Confirmation for the few actions that cannot be undone. */
import type { ReactNode } from 'react'
import { BigButton, Sheet } from '../../ui'

export interface ConfirmSheetProps {
  open: boolean
  onClose: () => void
  title: string
  confirmLabel: string
  onConfirm: () => void
  /** What is about to change, shown as rows. Never a paragraph. */
  children?: ReactNode
}

export function ConfirmSheet({
  open,
  onClose,
  title,
  confirmLabel,
  onConfirm,
  children,
}: ConfirmSheetProps) {
  function confirm() {
    onConfirm()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <BigButton floating={false} variant="danger" onClick={confirm}>
          {confirmLabel}
        </BigButton>
      }
    >
      <div className="flex flex-col gap-3">{children}</div>
    </Sheet>
  )
}

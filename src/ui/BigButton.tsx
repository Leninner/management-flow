import type { LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useActionSlot } from './AppShell'
import { cx } from './cx'

export type BigButtonVariant = 'primary' | 'quiet' | 'danger'

const VARIANT: Record<BigButtonVariant, string> = {
  primary: 'bg-brand text-white active:bg-brand/90',
  quiet: 'border border-line bg-card text-ink active:bg-brand-soft',
  danger: 'bg-owes text-white active:bg-owes/90',
}

export interface BigButtonProps {
  children: ReactNode
  onClick?: () => void
  icon?: LucideIcon
  variant?: BigButtonVariant
  /**
   * Default. The button pins itself to the bottom of the screen, above the
   * tab bar, wherever it is written in the screen. One per screen.
   * Set false for a button inside a sheet, a card or an empty state.
   */
  floating?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}

export function BigButton({
  children,
  onClick,
  icon: Icon,
  variant = 'primary',
  floating = true,
  disabled,
  type = 'button',
  className,
}: BigButtonProps) {
  const slot = useActionSlot()

  useEffect(() => {
    if (!floating || !slot) return
    return slot.claim()
  }, [floating, slot])

  const button = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-[1.1875rem] font-bold',
        'transition-transform active:scale-[0.99] disabled:opacity-40 motion-reduce:transition-none',
        VARIANT[variant],
        className,
      )}
    >
      {Icon && <Icon size={24} aria-hidden="true" />}
      {children}
    </button>
  )

  if (floating && slot?.node) return createPortal(button, slot.node)
  return button
}

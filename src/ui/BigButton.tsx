import type { LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useActionSlot } from './AppShell'
import { cx } from './cx'

export type BigButtonVariant = 'primary' | 'quiet' | 'danger'

const VARIANT: Record<BigButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-lift active:bg-brand-dark',
  quiet: 'bg-card text-ink shadow-card active:bg-brand-soft',
  danger: 'bg-owes text-white active:bg-owes/90',
}

export interface BigButtonProps {
  children: ReactNode
  onClick?: () => void
  /**
   * Turns the button into a real link. Leaving the app has to happen through
   * an anchor: window.open with a features string counts as a pop-up, and an
   * installed PWA blocks it without saying anything, so the tap does nothing.
   */
  href?: string
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
  href,
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

  const classes = cx(
    'flex min-h-[3.625rem] w-full items-center justify-center gap-2 rounded-full px-5 text-[1.1875rem] font-bold tracking-tight',
    'transition-transform active:scale-[0.99] disabled:opacity-40 motion-reduce:transition-none',
    VARIANT[variant],
    className,
  )

  const content = (
    <>
      {Icon && <Icon size={24} aria-hidden="true" />}
      {children}
    </>
  )

  const button =
    href !== undefined ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={classes}
      >
        {content}
      </a>
    ) : (
      <button type={type} onClick={onClick} disabled={disabled} className={classes}>
        {content}
      </button>
    )

  if (floating && slot?.node) return createPortal(button, slot.node)
  return button
}

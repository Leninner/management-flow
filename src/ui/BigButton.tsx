import type { LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useActionSlot } from './AppShell'
import { buttonClasses, type ButtonVariant } from './Button'
import { cx } from './cx'

export type BigButtonVariant = Extract<ButtonVariant, 'primary' | 'quiet' | 'danger'>

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

/**
 * The one big action of a screen, under the thumb.
 *
 * Built on the same class function as `Button` so there is a single definition
 * of what a button looks like. It keeps its own component because it also owns
 * the portal into the shell's action slot, which a normal button must not do.
 */
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

  const classes = buttonClasses({
    variant,
    size: 'lg',
    block: true,
    // The only shadow left in the app besides a sheet: this one genuinely
    // floats over content that scrolls underneath it.
    className: cx(variant === 'primary' && 'shadow-lift', className),
  })

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

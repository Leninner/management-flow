import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'quiet' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white active:bg-brand-dark',
  quiet: 'border border-line bg-card text-ink active:bg-brand-soft',
  danger: 'bg-owes text-white active:bg-owes/90',
  ghost: 'text-brand active:bg-brand-soft',
}

const SIZE: Record<ButtonSize, string> = {
  md: 'min-h-12 px-4 text-[1.0625rem] font-semibold',
  lg: 'min-h-[3.625rem] px-5 text-[1.1875rem] font-bold',
}

export interface ButtonProps {
  children?: ReactNode
  onClick?: () => void
  /**
   * Turns the button into a real link. Leaving the app has to happen through
   * an anchor: window.open with a features string counts as a pop-up, and an
   * installed PWA blocks it without saying anything, so the tap does nothing.
   */
  href?: string
  icon?: LucideIcon
  variant?: ButtonVariant
  size?: ButtonSize
  /** Fills the line it sits on. Off by default: only the hero button spans. */
  block?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  'aria-label'?: string
}

/** Shared by Button and BigButton, so there is one definition of a button. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  block,
  className,
}: Pick<ButtonProps, 'variant' | 'size' | 'block' | 'className'>): string {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-full tracking-tight',
    'transition-transform duration-150 ease-smooth active:scale-[0.99]',
    'disabled:opacity-40 motion-reduce:transition-none',
    SIZE[size],
    VARIANT[variant],
    block && 'w-full',
    className,
  )
}

/**
 * The button that is not the hero. Sits in the flow of the content, at 48px,
 * for sheets and cards. The one big action of a screen is `BigButton`.
 */
export function Button({
  children,
  onClick,
  href,
  icon: Icon,
  variant = 'primary',
  size = 'md',
  block,
  disabled,
  type = 'button',
  className,
  'aria-label': ariaLabel,
}: ButtonProps) {
  const classes = buttonClasses({ variant, size, block, className })

  const content = (
    <>
      {Icon && <Icon size={size === 'lg' ? 24 : 20} aria-hidden="true" />}
      {children}
    </>
  )

  if (href !== undefined) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        aria-label={ariaLabel}
        className={classes}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={classes}
    >
      {content}
    </button>
  )
}

import { cx } from './cx'

export interface AvatarProps {
  name: string
  size?: 'md' | 'lg'
  className?: string
}

const SIZE = {
  md: 'h-11 w-11 text-xl',
  lg: 'h-14 w-14 text-2xl',
} as const

/**
 * A letter in a circle. Cheaper to recognise mid-live than a name is to read,
 * and it never depends on a photo the app has no way to get.
 */
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand',
        SIZE[size],
        className,
      )}
    >
      {initial(name)}
    </span>
  )
}

/** "@karlita" reads as K, not as @. */
function initial(name: string): string {
  const letter = name.replace(/[^\p{L}\p{N}]/gu, '').charAt(0)
  return letter === '' ? '?' : letter.toUpperCase()
}

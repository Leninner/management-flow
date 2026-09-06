import { Search, X } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { cx } from './cx'

export interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Used mid-live, where the keyboard should already be up. */
  autoFocus?: boolean
  onSubmit?: (value: string) => void
  className?: string
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar',
  autoFocus,
  onSubmit,
  className,
}: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null)

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSubmit?.(value)
  }

  function clear() {
    onChange('')
    input.current?.focus()
  }

  return (
    <div
      className={cx(
        'flex min-h-14 items-center rounded-2xl border border-line bg-card pl-4 focus-within:border-brand',
        className,
      )}
    >
      <Search size={22} className="shrink-0 text-muted" aria-hidden="true" />
      <input
        ref={input}
        type="search"
        value={value}
        // The live capture screen opens straight into typing.
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent px-3 text-[1.1875rem] outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {value !== '' && (
        <button
          type="button"
          onClick={clear}
          aria-label="Borrar"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-muted active:bg-brand-soft"
        >
          <X size={24} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

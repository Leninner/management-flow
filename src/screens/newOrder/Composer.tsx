/**
 * The line being written, shaped like the line it will become.
 *
 * One field takes the code and the name: she types 38588, gives it a space,
 * and the code detaches into its own chip so the rest of the field is the name.
 * The price sits beside it, prefilled from this campaign when the app already
 * knows the product and left empty when it does not.
 *
 * THE NAME IS OPTIONAL. A code on its own is a whole line: it is what Oriflame
 * asks for and what she reads off the catalogue during a live. Requiring a name
 * to enable the plus meant that a product the app had never seen could not be
 * written down at all — the button simply did nothing and said nothing.
 *
 * Nothing here confirms anything. The plus writes the line and clears the row.
 */
import { Plus } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { CODE_THEN_SPACE, splitProductCode } from '../../domain'
import { cx, parseAmount, sanitizeAmount } from '../../ui'

export interface ComposedLine {
  code?: string
  name: string
  price?: number
}

export interface ComposerProps {
  /** Looks up what this campaign charges for a code, the moment it detaches. */
  priceFor: (code: string) => number | undefined
  onChange: (draft: { code?: string; name: string }) => void
  onSubmit: (line: ComposedLine) => void
  /** The suggestion a bare code resolves to, so Enter can take it. */
  fallbackName?: string
}

export function Composer({ priceFor, onChange, onSubmit, fallbackName }: ComposerProps) {
  const [code, setCode] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  function publish(nextCode: string | null, nextName: string) {
    onChange({ ...(nextCode ? { code: nextCode } : {}), name: nextName })
  }

  function type(value: string) {
    // The space after the digits is what detaches the code. Until it arrives
    // the digits are ordinary text, so a product whose name starts with a
    // number still works and nothing jumps under her thumb mid-word.
    if (code === null) {
      const split = CODE_THEN_SPACE.exec(value)
      if (split) {
        const found = split[1] ?? ''
        const rest = split[2] ?? ''
        setCode(found)
        setName(rest)
        const known = priceFor(found)
        if (price === '' && known !== undefined) setPrice(known.toFixed(2))
        publish(found, rest)
        return
      }
    }
    setName(value)
    publish(code, value)
  }

  function reset() {
    setCode(null)
    setName('')
    setPrice('')
    publish(null, '')
  }

  const typed = name.trim()
  // A code is enough on its own; without one there has to be something typed.
  const ready = typed !== '' || code !== null

  function submit() {
    if (!ready) return
    const amount = parseAmount(price)
    // What she typed wins, then whatever the app already knows this code is,
    // and failing both the code stands in as its own name until she fills it.
    const chosen = typed !== '' ? typed : (fallbackName ?? code ?? '')
    const split = code === null ? splitProductCode(chosen) : { code, name: chosen }
    onSubmit({
      ...(split.code ? { code: split.code } : {}),
      name: split.name,
      // An empty price stays empty. A zero is a price and it lies in every sum.
      ...(amount === undefined || amount <= 0 ? {} : { price: amount }),
    })
    reset()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && name === '' && code !== null) {
      event.preventDefault()
      setCode(null)
      setName(`${code} `)
      publish(null, `${code} `)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-[1.25rem] bg-card p-2 shadow-sheet">
      {code !== null && (
        <span className="money flex h-10 shrink-0 items-center rounded-xl bg-brand-soft px-3 text-[1.0625rem] font-bold text-brand-dark tabular-nums">
          {code}
        </span>
      )}
      <input
        type="text"
        value={name}
        onChange={(event) => type(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={code === null ? 'Código o nombre' : 'Nombre (opcional)'}
        aria-label="Producto"
        className="h-11 min-w-0 flex-1 bg-transparent px-1.5 text-[1.0625rem] outline-none"
      />
      <input
        type="text"
        inputMode="decimal"
        value={price}
        onChange={(event) => setPrice(sanitizeAmount(event.target.value))}
        onKeyDown={onKeyDown}
        placeholder="$"
        aria-label="Precio"
        className="money h-11 w-[4.75rem] shrink-0 rounded-xl bg-fill px-2.5 text-right text-[1.0625rem] font-bold tabular-nums outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!ready}
        aria-label="Anotar el renglón"
        className={cx(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white',
          'transition-colors motion-reduce:transition-none',
          ready ? 'bg-brand active:bg-brand-dark' : 'bg-muted/35',
        )}
      >
        <Plus size={24} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  )
}

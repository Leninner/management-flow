/**
 * Writing a line onto a pedido, wherever she is looking at one.
 *
 * There used to be two ways to do this: the composer while she wrote a pedido,
 * and a sheet with a search box, a stepper and a price field when she opened an
 * existing one. Same act, two interfaces, and only one of them knew what an
 * Oriflame code was. This is the one.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { campaignProducts, orders } from '../../data'
import { useActionSlot } from '../../ui'
import { Composer, type ComposedLine } from '../newOrder/Composer'
import { ProductLabel } from './Invoice'

export interface CatalogueEntry {
  code: string
  name: string
  price?: number
}

/**
 * What this campaign sells, at this campaign's prices.
 *
 * Anything only older pedidos know about comes in without a price: prices
 * change between catalogues, so last month's number is a suggestion to confirm
 * rather than a value to fill in behind her back.
 */
export function useCatalogue(campaignId: string): CatalogueEntry[] {
  const data = useLiveQuery(async () => {
    const [all, products] = await Promise.all([
      orders.listAll(),
      campaignProducts.listByCampaign(campaignId),
    ])
    return { all, products }
  }, [campaignId])

  return useMemo(() => {
    const byCode = new Map<string, CatalogueEntry>()
    for (const order of data?.all ?? []) {
      for (const item of order.items) {
        if (!item.code || byCode.has(item.code)) continue
        byCode.set(item.code, { code: item.code, name: item.name })
      }
    }
    for (const product of data?.products ?? []) {
      byCode.set(product.code, {
        code: product.code,
        name: product.name,
        ...(product.price === undefined ? {} : { price: product.price }),
      })
    }
    return [...byCode.values()]
  }, [data])
}

/**
 * With a code in hand there is exactly one product it can be, so the list
 * collapses to it. Without one it is an ordinary search over what she has sold.
 */
export function suggest(
  catalogue: readonly CatalogueEntry[],
  draft: { code?: string; name: string },
): CatalogueEntry[] {
  const typed = draft.name.trim()
  if (draft.code !== undefined) {
    const known = catalogue.find((entry) => entry.code === draft.code)
    if (typed !== '') {
      return [
        { code: draft.code, name: typed, ...(known?.price === undefined ? {} : { price: known.price }) },
      ]
    }
    return known ? [known] : []
  }
  if (typed === '') return []
  const needle = typed.toLowerCase()
  return catalogue
    .filter((entry) => `${entry.code} ${entry.name}`.toLowerCase().includes(needle))
    .slice(0, 3)
}

export interface AddLineProps {
  campaignId: string
  customerId: string
  catalogue: readonly CatalogueEntry[]
  draft: { code?: string; name: string }
  onDraft: (draft: { code?: string; name: string }) => void
}

/**
 * Rides in the shell's action slot, above whatever is at the bottom.
 *
 * Claiming that slot is not bookkeeping: unclaimed it keeps
 * `pointer-events-none`, so the row looks perfectly normal and cannot be
 * tapped at all.
 */
export function AddLine({ campaignId, customerId, catalogue, draft, onDraft }: AddLineProps) {
  const slot = useActionSlot()
  useEffect(() => slot?.claim(), [slot])

  const hits = suggest(catalogue, draft)

  async function write(line: ComposedLine) {
    await orders.addItem({
      campaignId,
      customerId,
      item: {
        ...(line.code ? { code: line.code } : {}),
        name: line.name,
        ...(line.price === undefined ? {} : { price: line.price }),
      },
    })
  }

  const content = (
    <div className="flex flex-col gap-2.5">
      {hits.length > 0 && (
        <div className="overflow-hidden rounded-card bg-card shadow-sheet">
          {hits.map((hit) => (
            <button
              key={hit.code}
              type="button"
              onClick={() => void write(hit)}
              className="flex h-[3.375rem] w-full items-center justify-between gap-3 border-b border-line px-[1.125rem] text-left last:border-b-0 active:bg-brand-soft"
            >
              <span className="min-w-0 truncate">
                <ProductLabel item={hit} />
              </span>
              <span className="money shrink-0 text-[0.9375rem] text-muted tabular-nums">
                {hit.price === undefined ? 'sin precio' : `$${hit.price.toFixed(2)}`}
              </span>
            </button>
          ))}
        </div>
      )}
      <Composer
        priceFor={(code) => catalogue.find((entry) => entry.code === code)?.price}
        onChange={onDraft}
        onSubmit={(line) => void write(line)}
        fallbackName={hits[0]?.name}
      />
    </div>
  )

  if (!slot?.node) return null
  return createPortal(content, slot.node)
}

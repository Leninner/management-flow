/**
 * El pedido a Oriflame. The single most valuable output of the app: without it
 * she opens twelve pedidos and adds them up by hand, and one unit short means
 * somebody gets nothing.
 *
 * The codes are copied in the shape Oriflame's quick order wants and the
 * basket opens right beside the button that copied them, so the gap between
 * deciding and paying is two taps.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Check, Copy, ExternalLink, PackageCheck, ShoppingBag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { campaigns, customers, orders } from '../data'
import { formatForQuickOrder, productLabel, withoutCode } from '../domain'
import {
  BigButton,
  Card,
  EmptyState,
  Row,
  Sheet,
  useNavigation,
} from '../ui'
import { ProductLabel } from './orders/Invoice'
import { formatDay, plural } from './supplier/format'
import { buildSupplierPlan, buyersLabel } from './supplier/plan'

/** How long the copy confirmation stays up. Long enough to leave the app. */
const COPIED_MS = 4000

/** Oriflame's quick order: product codes are typed in, one at a time. */
const ORIFLAME_BASKET = 'https://ec.oriflame.com/shopping/basket'

export function SupplierOrder() {
  const { push } = useNavigation()
  const [openLine, setOpenLine] = useState<string | null>(null)
  const [askingArrival, setAskingArrival] = useState(false)
  const [copied, setCopied] = useState(false)
  const [manualCopy, setManualCopy] = useState(false)

  const data = useLiveQuery(async () => {
    const campaign = await campaigns.getActive()
    if (!campaign) return { campaign: undefined, campaignOrders: [], people: [] }
    const [campaignOrders, people] = await Promise.all([
      orders.listByCampaign(campaign.id),
      customers.list(),
    ])
    return { campaign, campaignOrders, people }
  }, [])

  const plan = useMemo(
    () => buildSupplierPlan(data?.campaignOrders ?? [], data?.people ?? []),
    [data],
  )

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS)
    return () => window.clearTimeout(timer)
  }, [copied])

  if (!data) return null
  const { campaign } = data
  if (!campaign) return <EmptyState icon={CalendarDays} line="No hay una campaña abierta" />

  const campaignId = campaign.id
  const codes = formatForQuickOrder(plan.consolidation)
  const uncoded = withoutCode(plan.consolidation)
  const line = plan.lines.find((candidate) => candidate.key === openLine)

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(codes)
      setCopied(true)
    } catch {
      // Clipboard permission can be denied, and this list is the one thing she
      // cannot retype. Hand it over to be selected by hand instead.
      setManualCopy(true)
    }
  }

  return (
    <>
      <div className="px-1 pt-2 pb-5">
        <span className="block text-[0.9375rem] text-faint">
          {campaign.name} · corte {formatDay(campaign.cutoffDate)}
        </span>
        <span className="money mt-2 block text-[3rem] leading-none font-bold tracking-tight tabular-nums">
          {plan.consolidation.totalUnits}{' '}
          <span className="text-[1.375rem] font-semibold">
            {plan.consolidation.totalUnits === 1 ? 'unidad' : 'unidades'}
          </span>
        </span>
      </div>

      {plan.lines.length === 0 ? (
        <EmptyState icon={ShoppingBag} line="Todavía no hay nada que pedir" />
      ) : (
        <Card padded={false}>
          {plan.lines.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setOpenLine(item.key)}
              className="flex min-h-[3.75rem] w-full items-center gap-3 border-b border-line px-[1.125rem] py-2.5 text-left last:border-b-0 active:bg-brand-soft"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate leading-snug font-medium">
                  <ProductLabel item={item} />
                </span>
                <span className="mt-0.5 block truncate text-[0.875rem] text-muted">
                  {buyersLabel(item.customers)}
                </span>
              </span>
              <span className="money shrink-0 text-[1.375rem] font-bold tabular-nums">
                {item.quantity}
              </span>
            </button>
          ))}
        </Card>
      )}

      {uncoded.length > 0 && (
        <div className="pt-2">
          <Row
            status="pending"
            title={`${plural(uncoded.length, 'producto', 'productos')} sin código`}
            subtitle="No entra en lo copiado, búscalo a mano"
          />
        </div>
      )}

      {/*
        The order she does these in: copy, open the basket, pay, write down what
        it cost, and later say it arrived. Opening the basket used to float on
        its own halfway up the screen, orphaned from the button that filled the
        clipboard for it.
      */}
      <div className="flex flex-col gap-2 pt-3">
        <Card padded={false}>
          <a
            href={ORIFLAME_BASKET}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[3.75rem] w-full items-center gap-2 border-b border-line px-[1.125rem] py-2.5 font-semibold text-brand active:bg-brand-soft"
          >
            <ExternalLink size={20} aria-hidden="true" />
            Abrir el carrito de Oriflame
          </a>
          <button
            type="button"
            onClick={() => push({ kind: 'costs' })}
            className="flex min-h-[3.75rem] w-full items-center px-[1.125rem] py-2.5 text-left active:bg-brand-soft"
          >
            <span className="flex-1 font-semibold text-brand">¿Cuánto te costó?</span>
          </button>
        </Card>

        {campaign.arrivedAt ? (
          <Row status="done" title="Ya llegó la mercadería" subtitle={formatDay(campaign.arrivedAt)} />
        ) : (
          <Row icon={PackageCheck} title="Ya llegó la mercadería" onClick={() => setAskingArrival(true)} />
        )}
      </div>

      <Sheet
        open={openLine !== null}
        onClose={() => setOpenLine(null)}
        title={line ? productLabel(line) : undefined}
      >
        <div className="flex flex-col gap-2">
          {line?.customers.map((buyer) => (
            <Row
              key={buyer.customerId}
              status={buyer.unpaid ? 'owes' : undefined}
              title={buyer.name}
              subtitle={buyer.unpaid ? 'no ha abonado' : undefined}
              count={buyer.quantity}
            />
          ))}
        </div>
      </Sheet>

      <Sheet
        open={askingArrival}
        onClose={() => setAskingArrival(false)}
        title="¿Ya llegó?"
        footer={
          <BigButton
            floating={false}
            icon={PackageCheck}
            onClick={() => void campaigns.markArrived(campaignId).then(() => setAskingArrival(false))}
          >
            Sí, ya llegó
          </BigButton>
        }
      >
        <Row
          status="pending"
          title={campaign.name}
          subtitle={plural(plan.consolidation.customerCount, 'cliente esperando', 'clientes esperando')}
          count={plan.consolidation.totalUnits}
        />
      </Sheet>

      <Sheet
        open={manualCopy}
        onClose={() => setManualCopy(false)}
        title="Copia los códigos"
        footer={
          <BigButton floating={false} variant="quiet" onClick={() => setManualCopy(false)}>
            Listo
          </BigButton>
        }
      >
        <textarea
          readOnly
          value={codes}
          rows={12}
          aria-label="Códigos para Oriflame"
          onFocus={(event) => event.currentTarget.select()}
          className="w-full rounded-2xl bg-fill p-4 font-mono text-base text-ink outline-none"
        />
      </Sheet>

      <BigButton icon={copied ? Check : Copy} onClick={copyCodes} disabled={codes === ''}>
        {copied ? 'Copiado' : 'Copiar los códigos'}
      </BigButton>
    </>
  )
}

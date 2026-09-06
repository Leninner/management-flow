/**
 * The order she places with Oriflame. The single most valuable output of the
 * app: without it she opens twelve orders and adds them up by hand, and one
 * unit short means somebody gets nothing.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Check, Copy, PackageCheck, ShoppingBag, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { campaigns, customers, orders } from '../data'
import { formatForClipboard } from '../domain'
import {
  BigButton,
  Card,
  EmptyState,
  Row,
  RowAction,
  SectionHeader,
  Sheet,
  StatusPill,
} from '../ui'
import { formatDay, plural } from './supplier/format'
import { buildSupplierPlan, buyersLabel } from './supplier/plan'

/** How long the copy confirmation stays up. Long enough to leave the app. */
const COPIED_MS = 4000

async function loadCampaignOrders() {
  const campaign = await campaigns.getActive()
  if (!campaign) return { campaign: undefined, campaignOrders: [], people: [] }
  const [campaignOrders, people] = await Promise.all([
    orders.listByCampaign(campaign.id),
    customers.list(),
  ])
  return { campaign, campaignOrders, people }
}

export function SupplierOrder() {
  const data = useLiveQuery(loadCampaignOrders, [])
  const [includeUnconfirmed, setIncludeUnconfirmed] = useState(true)
  const [openLine, setOpenLine] = useState<string | null>(null)
  const [askingArrival, setAskingArrival] = useState(false)
  const [copied, setCopied] = useState(false)
  const [manualCopy, setManualCopy] = useState(false)

  const plan = useMemo(
    () => buildSupplierPlan(data?.campaignOrders ?? [], data?.people ?? [], includeUnconfirmed),
    [data, includeUnconfirmed],
  )

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS)
    return () => window.clearTimeout(timer)
  }, [copied])

  if (!data) return null

  const { campaign } = data
  if (!campaign) {
    return <EmptyState icon={CalendarDays} line="No hay una campaña abierta" />
  }

  const campaignId = campaign.id
  const text = formatForClipboard(plan.consolidation, campaign.name)
  const line = plan.lines.find((candidate) => candidate.name === openLine)

  async function copyOrder() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Clipboard permission can be denied, and this text is the one thing she
      // cannot retype. Hand it over to be selected by hand instead.
      setManualCopy(true)
    }
  }

  async function markArrived() {
    await campaigns.markArrived(campaignId)
    setAskingArrival(false)
  }

  return (
    <>
      <div className="pt-4">
        <Card className="flex items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block truncate text-xl leading-tight font-bold">{campaign.name}</span>
            {copied ? (
              <StatusPill status="done" label="Copiado" className="mt-1.5" />
            ) : (
              <span className="mt-1 block truncate text-[0.9375rem] leading-tight text-muted">
                {plural(plan.consolidation.customerCount, 'cliente', 'clientes')} · corte{' '}
                {formatDay(campaign.cutoffDate)}
              </span>
            )}
          </span>
          <span className="shrink-0 text-right">
            <span className="money block text-[2.25rem] leading-none font-bold tabular-nums">
              {plan.consolidation.totalUnits}
            </span>
            <span className="mt-1 block text-[0.9375rem] text-muted">unidades</span>
          </span>
        </Card>
      </div>

      {plan.unconfirmedOrders > 0 && (
        <>
          <SectionHeader title="Sin confirmar" />
          <Row
            status={includeUnconfirmed ? 'pending' : undefined}
            title={includeUnconfirmed ? 'Van en el pedido' : 'Fuera del pedido'}
            subtitle={plural(plan.unconfirmedOrders, 'pedido', 'pedidos')}
            count={plan.unconfirmedUnits}
            actions={
              includeUnconfirmed ? (
                <RowAction icon={X} onClick={() => setIncludeUnconfirmed(false)}>
                  Sacarlas
                </RowAction>
              ) : (
                <RowAction icon={Undo2} onClick={() => setIncludeUnconfirmed(true)}>
                  Volver a meterlas
                </RowAction>
              )
            }
          />
        </>
      )}

      <SectionHeader title="Productos" count={plan.lines.length} />
      {plan.lines.length === 0 ? (
        <EmptyState icon={ShoppingBag} line="Todavía no hay nada que pedir" />
      ) : (
        <div className="flex flex-col gap-2">
          {plan.lines.map((item) => (
            <Row
              key={item.name}
              title={item.name}
              subtitle={buyersLabel(item.customers)}
              count={item.quantity}
              onClick={() => setOpenLine(item.name)}
            />
          ))}
        </div>
      )}

      <SectionHeader title="Mercadería" />
      {campaign.arrivedAt ? (
        <Row status="done" title="Ya llegó" subtitle={formatDay(campaign.arrivedAt)} />
      ) : (
        <Row
          icon={PackageCheck}
          title="Ya llegó la mercadería"
          onClick={() => setAskingArrival(true)}
        />
      )}

      <Sheet open={openLine !== null} onClose={() => setOpenLine(null)} title={line?.name}>
        <div className="flex flex-col gap-2">
          {line?.customers.map((buyer) => (
            <Row
              key={buyer.customerId}
              status={buyer.confirmed ? undefined : 'pending'}
              title={buyer.name}
              subtitle={buyer.confirmed ? undefined : 'sin confirmar'}
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
          <BigButton floating={false} icon={PackageCheck} onClick={markArrived}>
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
        title="Copia el texto"
        footer={
          <BigButton floating={false} variant="quiet" onClick={() => setManualCopy(false)}>
            Listo
          </BigButton>
        }
      >
        <textarea
          readOnly
          value={text}
          rows={12}
          aria-label="Pedido a Oriflame"
          onFocus={(event) => event.currentTarget.select()}
          className="w-full rounded-2xl border border-line bg-card p-4 font-mono text-base text-ink outline-none"
        />
      </Sheet>

      <BigButton
        icon={copied ? Check : Copy}
        onClick={copyOrder}
        disabled={plan.lines.length === 0}
      >
        {copied ? 'Copiado' : 'Copiar el pedido'}
      </BigButton>
    </>
  )
}

import { Inbox, MessageCircle, Send, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { BigButton } from './BigButton'
import { Card } from './Card'
import { CountBadge } from './CountBadge'
import { EmptyState } from './EmptyState'
import { Money } from './Money'
import { Row, RowAction } from './Row'
import { SearchField } from './SearchField'
import { SectionHeader } from './SectionHeader'
import { Sheet } from './Sheet'
import { STATUSES } from './status'
import { StatusDot } from './StatusDot'
import { StatusPill } from './StatusPill'
import { Stepper } from './Stepper'

/**
 * Every piece, in every state, on one page. This is how the look gets reviewed
 * without needing real data behind it. Reachable from Más › Diseño.
 */
export function Gallery() {
  const [query, setQuery] = useState('María')
  const [emptyQuery, setEmptyQuery] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <SectionHeader title="Estados" />
      <Card className="flex flex-wrap items-center gap-3">
        {STATUSES.map((status) => (
          <StatusDot key={status} status={status} />
        ))}
        <StatusDot />
        {STATUSES.map((status) => (
          <StatusPill key={status} status={status} />
        ))}
        <StatusPill status="pending" label="Sin confirmar" />
      </Card>

      <SectionHeader title="Contadores" />
      <Card className="flex flex-wrap items-center gap-3">
        <CountBadge count={4} />
        {STATUSES.map((status) => (
          <CountBadge key={status} count={12} tone={status} />
        ))}
        <CountBadge count={9} variant="alert" />
        <CountBadge count={128} />
      </Card>

      <SectionHeader title="Plata" />
      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <Money value={84.5} size="sm" />
          <Money value={84.5} size="md" />
          <Money value={84.5} size="lg" />
        </div>
        <Money value={1234.5} size="xl" tone="owes" />
        <div className="flex items-baseline gap-3">
          <Money value={18} size="lg" tone="owes" />
          <Money value={0} size="lg" tone="pending" />
          <Money value={42.9} size="lg" tone="done" />
        </div>
        <Money value={-7.25} size="md" tone="owes" />
      </Card>

      <SectionHeader title="Filas" count={7} />
      <div className="flex flex-col gap-2">
        <Row
          status="owes"
          title="María Fernanda"
          subtitle="@maria23 · confirmó, no ha pagado"
          amount={84.5}
          onClick={() => {}}
        />
        <Row
          status="pending"
          title="Ana Lucía"
          subtitle="0987654321 · llegó, falta entregar"
          amount={32}
          onClick={() => {}}
        />
        <Row status="done" title="Rosa Elena" subtitle="Entregado el 3 de sept" amount={0} />
        <Row
          title="Cliente sin estado todavía"
          subtitle="Capturado en el live, sin confirmar"
          amount={12.9}
          onClick={() => {}}
        />
        <Row status="owes" title="Por cobrar" amount={84.5} count={5} />
        <Row status="pending" title="Por entregar" count={3} />
        <Row
          icon={Truck}
          title="Un nombre larguísimo que no cabe de ninguna manera en la fila"
          subtitle="Y una línea de apoyo que tampoco cabe completa aquí"
          amount={9999.99}
          onClick={() => {}}
        />
        <Row
          status="owes"
          title="Con acciones"
          subtitle="sin confirmar, 2 días"
          amount={26.4}
          onClick={() => {}}
          actions={
            <>
              <RowAction icon={MessageCircle}>WhatsApp</RowAction>
              <RowAction icon={Send}>Ya escribí</RowAction>
            </>
          }
        />
      </div>

      <SectionHeader title="Buscar" />
      <div className="flex flex-col gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Nombre, @usuario o celular" />
        <SearchField value={emptyQuery} onChange={setEmptyQuery} placeholder="Producto o código" />
      </div>

      <SectionHeader title="Cantidad" />
      <Card className="flex items-center justify-between gap-4">
        <span className="text-xl font-semibold">38588 Novage</span>
        <Stepper value={quantity} onChange={setQuantity} />
      </Card>

      <SectionHeader title="Botones" />
      <div className="flex flex-col gap-3">
        <BigButton floating={false} icon={Send}>
          Capturar pedido
        </BigButton>
        <BigButton floating={false} variant="quiet">
          Ver el pedido
        </BigButton>
        <BigButton floating={false} variant="danger" icon={Trash2}>
          Borrar pedido
        </BigButton>
        <BigButton floating={false} disabled>
          Sin nada que hacer
        </BigButton>
      </div>

      <SectionHeader title="Vacíos" />
      <Card padded={false}>
        <EmptyState
          icon={Inbox}
          line="Todavía no hay pedidos"
          actionLabel="Capturar pedido"
          onAction={() => setSheetOpen(true)}
        />
      </Card>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Registrar abono"
        footer={
          <BigButton floating={false} onClick={() => setSheetOpen(false)}>
            Guardar
          </BigButton>
        }
      >
        <div className="flex flex-col gap-3">
          <Row status="owes" title="María Fernanda" subtitle="Saldo" amount={84.5} />
          <Card className="flex items-center justify-between gap-4">
            <span className="text-xl font-semibold">Abonó</span>
            <Money value={40} size="lg" tone="done" />
          </Card>
        </div>
      </Sheet>

      <BigButton onClick={() => setSheetOpen(true)}>Abrir la hoja</BigButton>
    </>
  )
}

/**
 * The settings tab. She opens it to set up how she gets paid, not to administer
 * a database, so her own data comes first and the backup chore goes last -- which
 * also puts its big button where the thumb already is.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CalendarDays,
  CalendarPlus,
  Check,
  Download,
  CreditCard,
  Landmark,
  MessageCircle,
  ShoppingBag,
  Upload,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TemplateKey } from '../content/templates'
import { backup, campaigns, orders, settings } from '../data'
import { nowIso } from '../domain'
import {
  BigButton,
  Row,
  RowAction,
  SectionHeader,
  Sheet,
  StatusPill,
  TextArea,
  useNavigation,
} from '../ui'
import {
  BANK_ACCOUNT_KEY,
  backupAge,
  downloadBackup,
  LAST_BACKUP_KEY,
} from './more/backupFile'
import { cardSummary, readCardSettings } from './more/card'
import { CardSheet } from './more/CardSheet'
import { EditCampaignSheet } from './more/EditCampaignSheet'

import { formatDay } from './more/format'
import { NewCampaignSheet } from './more/NewCampaignSheet'
import { previewTemplate } from './more/preview'
import { RestoreSheet } from './more/RestoreSheet'
import { TemplateSheet } from './more/TemplateSheet'
import { firstLine, resolveTemplates, templateSettingKey, type EditableTemplate } from './more/templates'

/** How long the "guardado" confirmation stays up after an export. */
const SAVED_MS = 4000

async function loadSettings() {
  const campaign = await campaigns.getActive()
  const [entries, campaignOrders] = await Promise.all([
    settings.all(),
    campaign ? orders.listByCampaign(campaign.id) : Promise.resolve([]),
  ])
  return {
    campaign,
    values: new Map(entries.map((entry) => [entry.key, entry.value])),
    unconfirmedCount: campaignOrders.filter((order) => !order.confirmed).length,
  }
}

export function More() {
  const { push } = useNavigation()
  const state = useLiveQuery(loadSettings, [])
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [editing, setEditing] = useState<EditableTemplate | null>(null)
  const [bankDraft, setBankDraft] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(false)
  const [editingCard, setEditingCard] = useState(false)
  const [startingCampaign, setStartingCampaign] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    const storage = navigator.storage
    if (!storage?.persisted) return
    storage.persisted().then(
      (value) => {
        if (alive) setPersisted(value)
      },
      () => {
        if (alive) setPersisted(null)
      },
    )
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(() => setSaved(false), SAVED_MS)
    return () => window.clearTimeout(timer)
  }, [saved])

  if (!state) return null

  const { campaign, values, unconfirmedCount } = state
  const age = backupAge(values.get(LAST_BACKUP_KEY), nowIso())
  const bankAccount = values.get(BANK_ACCOUNT_KEY) ?? ''
  const templates = resolveTemplates(values)
  const card = readCardSettings(values)

  async function saveBackup() {
    const file = await backup.exportBackup()
    downloadBackup(file)
    await settings.set(LAST_BACKUP_KEY, file.exportedAt)
    setSaved(true)
  }

  async function saveTemplate(key: TemplateKey, body: string) {
    const setting = templateSettingKey(key)
    const original = templates.find((entry) => entry.template.key === key)?.template.body
    // Back to the words it shipped with is the same thing as no edit at all.
    if (body === original) await settings.remove(setting)
    else await settings.set(setting, body)
    setEditing(null)
  }

  async function saveBank(value: string) {
    const clean = value.trim()
    if (clean === '') await settings.remove(BANK_ACCOUNT_KEY)
    else await settings.set(BANK_ACCOUNT_KEY, clean)
    setBankDraft(null)
  }

  return (
    <>
      <SectionHeader title="Cuenta" />
      <Row
        icon={Landmark}
        title="Mis datos"
        subtitle={bankAccount === '' ? 'Sin datos' : firstLine(bankAccount)}
        onClick={() => setBankDraft(bankAccount)}
      />

      <SectionHeader title="Tarjeta" />
      <Row
        icon={CreditCard}
        title="Mi tarjeta"
        subtitle={cardSummary(card) ?? 'Sin configurar'}
        onClick={() => setEditingCard(true)}
      />

      <SectionHeader title="Campaña" />
      <div className="flex flex-col gap-2">
        {campaign ? (
          <Row
            icon={CalendarDays}
            title={campaign.name}
            subtitle={`corte ${formatDay(campaign.cutoffDate)}`}
            onClick={() => setEditingCampaign(true)}
          />
        ) : (
          <Row icon={CalendarDays} title="Sin campaña abierta" />
        )}
        <Row
          icon={ShoppingBag}
          title="Pedido a Oriflame"
          onClick={() => push({ kind: 'supplierOrder' })}
        />
        <Row
          icon={CalendarPlus}
          title="Nueva campaña"
          subtitle={unconfirmedCount > 0 ? `${unconfirmedCount} sin confirmar` : undefined}
          onClick={() => setStartingCampaign(true)}
        />
      </div>

      <SectionHeader title="Mensajes" />
      <div className="flex flex-col gap-2">
        {templates.map((entry) => (
          <Row
            key={entry.template.key}
            icon={MessageCircle}
            title={entry.template.label}
            subtitle={firstLine(previewTemplate(entry.body, bankAccount))}
            onClick={() => setEditing(entry)}
          />
        ))}
      </div>

      <SectionHeader title="Respaldo" />
      <div className="flex flex-col gap-2">
        <Row
          status={age.status}
          title="Último respaldo"
          subtitle={age.label}
          count={age.days}
          trailing={age.pill ? <StatusPill status={age.status} label={age.pill} /> : undefined}
          actions={
            <RowAction icon={Upload} onClick={() => setRestoring(true)}>
              Restaurar
            </RowAction>
          }
        />
        {persisted === false && (
          <Row
            status="owes"
            title="El navegador puede borrar todo"
            subtitle="Guarda el respaldo seguido"
          />
        )}
        <BigButton floating={false} icon={saved ? Check : Download} onClick={saveBackup}>
          {saved ? 'Guardado' : 'Guardar respaldo'}
        </BigButton>
      </div>

      <TemplateSheet
        template={editing}
        bankAccount={bankAccount}
        onClose={() => setEditing(null)}
        onSave={saveTemplate}
      />

      <Sheet
        open={bankDraft !== null}
        onClose={() => setBankDraft(null)}
        title="Mi cuenta"
        footer={
          <BigButton floating={false} onClick={() => saveBank(bankDraft ?? '')}>
            Guardar
          </BigButton>
        }
      >
        <TextArea
          value={bankDraft ?? ''}
          onChange={setBankDraft}
          ariaLabel="Datos de la cuenta"
          placeholder={'Banco Pichincha\nAhorros 2201234567\nMaría Pérez · 1803456789'}
          rows={6}
        />
      </Sheet>

      <CardSheet open={editingCard} onClose={() => setEditingCard(false)} card={card} />

      <RestoreSheet
        open={restoring}
        onClose={() => setRestoring(false)}
        onRestored={() => setRestoring(false)}
      />

      <EditCampaignSheet
        open={editingCampaign}
        onClose={() => setEditingCampaign(false)}
        campaign={campaign}
      />

      <NewCampaignSheet
        open={startingCampaign}
        onClose={() => setStartingCampaign(false)}
        currentCampaignId={campaign?.id}
        unconfirmedCount={unconfirmedCount}
      />

    </>
  )
}

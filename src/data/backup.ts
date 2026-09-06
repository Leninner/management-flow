/**
 * Export and import.
 *
 * The backup is not optional. The browser can evict IndexedDB at any time —
 * clearing site data, low memory, reinstalling the PWA — and without a file
 * there is no record of who owes money.
 */
import { db } from '../db/db'
import type { BackupFile, Campaign, Customer, Order, OrderItem, Setting } from '../db/types'
import { nowIso } from '../domain/dates'

export const BACKUP_VERSION = 1

/** Thrown when a file is not a backup this app can read. */
export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupFormatError'
  }
}

export async function exportBackup(): Promise<BackupFile> {
  return db.transaction('r', db.campaigns, db.customers, db.orders, db.settings, async () => ({
    version: BACKUP_VERSION,
    exportedAt: nowIso(),
    campaigns: await db.campaigns.orderBy('id').toArray(),
    customers: await db.customers.orderBy('id').toArray(),
    orders: await db.orders.orderBy('id').toArray(),
    settings: await db.settings.orderBy('key').toArray(),
  }))
}

/**
 * Replaces everything, never merges. The file is fully validated before a
 * single table is touched, so a bad file leaves the data as it was.
 */
export async function importBackup(file: unknown): Promise<void> {
  const backup = parseBackup(file)

  await db.transaction('rw', db.campaigns, db.customers, db.orders, db.settings, async () => {
    await db.campaigns.clear()
    await db.customers.clear()
    await db.orders.clear()
    await db.settings.clear()
    await db.campaigns.bulkAdd(backup.campaigns)
    await db.customers.bulkAdd(backup.customers)
    await db.orders.bulkAdd(backup.orders)
    await db.settings.bulkAdd(backup.settings)
  })
}

export function parseBackup(file: unknown): BackupFile {
  const raw = asRecord(file, 'backup file')
  if (raw.version !== BACKUP_VERSION) {
    throw new BackupFormatError(`Unsupported backup version: ${String(raw.version)}`)
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : nowIso(),
    campaigns: asArray(raw.campaigns, 'campaigns').map(parseCampaign),
    customers: asArray(raw.customers, 'customers').map(parseCustomer),
    orders: asArray(raw.orders, 'orders').map(parseOrder),
    settings: asArray(raw.settings, 'settings').map(parseSetting),
  }
}

type Raw = Record<string, unknown>

function asRecord(value: unknown, where: string): Raw {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BackupFormatError(`Expected an object in ${where}`)
  }
  return value as Raw
}

function asArray(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) throw new BackupFormatError(`Expected a list of ${where}`)
  return value
}

function asString(value: unknown, where: string): string {
  if (typeof value !== 'string') throw new BackupFormatError(`Expected a text value in ${where}`)
  return value
}

function asOptionalString(value: unknown, where: string): string | undefined {
  return value === undefined || value === null ? undefined : asString(value, where)
}

function asNumber(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BackupFormatError(`Expected a number in ${where}`)
  }
  return value
}

function asBoolean(value: unknown, where: string): boolean {
  if (typeof value !== 'boolean') throw new BackupFormatError(`Expected true or false in ${where}`)
  return value
}

function optional<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : ({ [key]: value } as Record<string, T>)
}

function parseCampaign(value: unknown): Campaign {
  const raw = asRecord(value, 'a campaign')
  return {
    id: asString(raw.id, 'campaign.id'),
    name: asString(raw.name, 'campaign.name'),
    cutoffDate: asString(raw.cutoffDate, 'campaign.cutoffDate'),
    active: asBoolean(raw.active, 'campaign.active'),
    ...optional('arrivedAt', asOptionalString(raw.arrivedAt, 'campaign.arrivedAt')),
  }
}

function parseCustomer(value: unknown): Customer {
  const raw = asRecord(value, 'a customer')
  return {
    id: asString(raw.id, 'customer.id'),
    name: asString(raw.name, 'customer.name'),
    aliases: asArray(raw.aliases, 'customer.aliases').map((alias) => asString(alias, 'customer.aliases')),
    // Backups written before the contact log existed simply have none.
    contacts:
      raw.contacts === undefined
        ? []
        : asArray(raw.contacts, 'customer.contacts').map((contact) => asString(contact, 'customer.contacts')),
    ...optional('whatsapp', asOptionalString(raw.whatsapp, 'customer.whatsapp')),
    ...optional('address', asOptionalString(raw.address, 'customer.address')),
  }
}

function parseItem(value: unknown): OrderItem {
  const raw = asRecord(value, 'an order item')
  return {
    name: asString(raw.name, 'item.name'),
    quantity: asNumber(raw.quantity, 'item.quantity'),
    price: asNumber(raw.price, 'item.price'),
  }
}

function parseOrder(value: unknown): Order {
  const raw = asRecord(value, 'an order')
  return {
    id: asString(raw.id, 'order.id'),
    campaignId: asString(raw.campaignId, 'order.campaignId'),
    customerId: asString(raw.customerId, 'order.customerId'),
    items: asArray(raw.items, 'order.items').map(parseItem),
    paidAmount: asNumber(raw.paidAmount, 'order.paidAmount'),
    shippingCost: asNumber(raw.shippingCost, 'order.shippingCost'),
    confirmed: asBoolean(raw.confirmed, 'order.confirmed'),
    contacts: asArray(raw.contacts, 'order.contacts').map((contact) => asString(contact, 'order.contacts')),
    createdAt: asString(raw.createdAt, 'order.createdAt'),
    ...optional('deliveredAt', asOptionalString(raw.deliveredAt, 'order.deliveredAt')),
    ...optional('notes', asOptionalString(raw.notes, 'order.notes')),
  }
}

function parseSetting(value: unknown): Setting {
  const raw = asRecord(value, 'a setting')
  return { key: asString(raw.key, 'setting.key'), value: asString(raw.value, 'setting.value') }
}

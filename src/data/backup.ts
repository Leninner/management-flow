/**
 * Export and import.
 *
 * The backup is not optional. The browser can evict IndexedDB at any time —
 * clearing site data, low memory, reinstalling the PWA — and without a file
 * there is no record of who owes money.
 */
import { db } from '../db/db'
import type {
  BackupFile,
  Campaign,
  CampaignProduct,
  Customer,
  Order,
  OrderItem,
  Setting,
} from '../db/types'
import { nowIso } from '../domain/dates'
import { splitProductCode } from '../domain/text'

export const BACKUP_VERSION = 2

/** Files written before codes were split out of names and confirmation was dropped. */
const LEGACY_VERSION = 1

/** Thrown when a file is not a backup this app can read. */
export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupFormatError'
  }
}

export async function exportBackup(): Promise<BackupFile> {
  return db.transaction(
    'r',
    db.campaigns,
    db.customers,
    db.orders,
    db.campaignProducts,
    db.settings,
    async () => ({
      version: BACKUP_VERSION,
      exportedAt: nowIso(),
      campaigns: await db.campaigns.orderBy('id').toArray(),
      customers: await db.customers.orderBy('id').toArray(),
      orders: await db.orders.orderBy('id').toArray(),
      campaignProducts: await db.campaignProducts.orderBy('id').toArray(),
      settings: await db.settings.orderBy('key').toArray(),
    }),
  )
}

/**
 * Replaces everything, never merges. The file is fully validated before a
 * single table is touched, so a bad file leaves the data as it was.
 */
export async function importBackup(file: unknown): Promise<void> {
  const backup = parseBackup(file)

  await db.transaction(
    'rw',
    db.campaigns,
    db.customers,
    db.orders,
    db.campaignProducts,
    db.settings,
    async () => {
      await db.campaigns.clear()
      await db.customers.clear()
      await db.orders.clear()
      await db.campaignProducts.clear()
      await db.settings.clear()
      await db.campaigns.bulkAdd(backup.campaigns)
      await db.customers.bulkAdd(backup.customers)
      await db.orders.bulkAdd(backup.orders)
      await db.campaignProducts.bulkAdd(backup.campaignProducts)
      await db.settings.bulkAdd(backup.settings)
    },
  )
}

/**
 * Reads a backup of either version. A file written by the previous version is
 * still the only copy of who owes money that somebody may have on a pen drive,
 * so it is upgraded on the way in rather than rejected.
 */
export function parseBackup(file: unknown): BackupFile {
  const raw = asRecord(file, 'backup file')
  if (raw.version !== BACKUP_VERSION && raw.version !== LEGACY_VERSION) {
    throw new BackupFormatError(`Unsupported backup version: ${String(raw.version)}`)
  }

  const orders = asArray(raw.orders, 'orders').map(parseOrder)
  const campaignProducts =
    raw.campaignProducts === undefined
      ? seedProducts(orders)
      : asArray(raw.campaignProducts, 'campaignProducts').map(parseCampaignProduct)

  return {
    version: BACKUP_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : nowIso(),
    campaigns: asArray(raw.campaigns, 'campaigns').map(parseCampaign),
    customers: asArray(raw.customers, 'customers').map(parseCustomer),
    orders,
    campaignProducts,
    settings: asArray(raw.settings, 'settings').map(parseSetting),
  }
}

/**
 * A v1 file has no product table. Rebuild it from the items, taking the price
 * each product was most often sold at in that campaign, exactly like the
 * database migration does.
 */
function seedProducts(orders: readonly Order[]): CampaignProduct[] {
  const products = new Map<string, CampaignProduct>()
  const votes = new Map<string, Map<number, number>>()

  for (const order of orders) {
    for (const item of order.items) {
      if (!item.code) continue
      const id = `${order.campaignId}:${item.code}`
      if (!products.has(id)) {
        products.set(id, { id, campaignId: order.campaignId, code: item.code, name: item.name })
      }
      if (item.price === undefined) continue
      const seen = votes.get(id) ?? new Map<number, number>()
      seen.set(item.price, (seen.get(item.price) ?? 0) + 1)
      votes.set(id, seen)
    }
  }

  return [...products.values()]
    .map((product) => {
      const seen = votes.get(product.id)
      if (!seen) return product
      let price = 0
      let best = 0
      for (const [candidate, count] of seen) {
        if (count > best || (count === best && candidate > price)) {
          price = candidate
          best = count
        }
      }
      return { ...product, price }
    })
    .sort((a, b) => a.id.localeCompare(b.id))
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

function asOptionalNumber(value: unknown, where: string): number | undefined {
  return value === undefined || value === null ? undefined : asNumber(value, where)
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
    ...optional(
      'supplierInvoiceAmount',
      asOptionalNumber(raw.supplierInvoiceAmount, 'campaign.supplierInvoiceAmount'),
    ),
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
  const written = asString(raw.name, 'item.name')
  const code = asOptionalString(raw.code, 'item.code')
  // v1 kept the code inside the name and used 0 for "no price yet". Both are
  // undone here so an imported file behaves like data written today.
  const split = code ? { code, name: written } : splitProductCode(written)
  const price = raw.price === undefined || raw.price === null ? undefined : asNumber(raw.price, 'item.price')

  return {
    ...(split.code ? { code: split.code } : {}),
    name: split.name,
    quantity: asNumber(raw.quantity, 'item.quantity'),
    ...(price === undefined || price === 0 ? {} : { price }),
  }
}

function parseCampaignProduct(value: unknown): CampaignProduct {
  const raw = asRecord(value, 'a campaign product')
  const campaignId = asString(raw.campaignId, 'campaignProduct.campaignId')
  const code = asString(raw.code, 'campaignProduct.code')
  return {
    id: typeof raw.id === 'string' ? raw.id : `${campaignId}:${code}`,
    campaignId,
    code,
    name: asString(raw.name, 'campaignProduct.name'),
    ...optional('price', asOptionalNumber(raw.price, 'campaignProduct.price')),
    ...optional('cost', asOptionalNumber(raw.cost, 'campaignProduct.cost')),
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

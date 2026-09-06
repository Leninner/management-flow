import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import type { BackupFile } from '../db/types'
import { BackupFormatError, exportBackup, importBackup } from './backup'
import { resetDatabase } from './test-db'

async function seed() {
  await db.campaigns.add({ id: 'camp-13', name: 'C13-2026', cutoffDate: '2026-09-20', active: true })
  await db.campaigns.add({ id: 'camp-12', name: 'C12-2026', cutoffDate: '2026-08-20', active: false })
  await db.customers.add({
    id: 'cus-1',
    name: 'María Fernanda',
    aliases: ['@maria23'],
    whatsapp: '0987654321',
    contacts: ['2026-09-02T00:00:00.000Z'],
  })
  await db.orders.add({
    id: 'ord-1',
    campaignId: 'camp-13',
    customerId: 'cus-1',
    items: [{ name: '38588 Novage', quantity: 2, price: 12.9 }],
    paidAmount: 5,
    shippingCost: 0,
    confirmed: true,
    contacts: ['2026-09-03T00:00:00.000Z'],
    createdAt: '2026-09-01T00:00:00.000Z',
    notes: 'retira en Ambato',
  })
  await db.settings.put({ key: 'bank.account', value: 'Pichincha 22012345' })
}

beforeEach(resetDatabase)

describe('exportBackup', () => {
  it('carries the version, the timestamp and every table', async () => {
    await seed()
    const backup = await exportBackup()

    expect(backup.version).toBe(1)
    expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(backup.campaigns).toHaveLength(2)
    expect(backup.customers).toHaveLength(1)
    expect(backup.orders).toHaveLength(1)
    expect(backup.settings).toEqual([{ key: 'bank.account', value: 'Pichincha 22012345' }])
  })

  it('exports an empty file on a fresh install', async () => {
    const backup = await exportBackup()
    expect(backup).toMatchObject({ version: 1, campaigns: [], customers: [], orders: [], settings: [] })
  })
})

describe('the round trip', () => {
  it('survives a JSON round trip, a wipe and an import', async () => {
    await seed()
    const before = await exportBackup()
    const file = JSON.parse(JSON.stringify(before)) as BackupFile

    await resetDatabase()
    await expect(db.orders.count()).resolves.toBe(0)

    await importBackup(file)

    const after = await exportBackup()
    expect(after.campaigns).toEqual(before.campaigns)
    expect(after.customers).toEqual(before.customers)
    expect(after.orders).toEqual(before.orders)
    expect(after.settings).toEqual(before.settings)
  })

  it('replaces everything instead of merging', async () => {
    await seed()
    const file = JSON.parse(JSON.stringify(await exportBackup())) as BackupFile

    await resetDatabase()
    await db.customers.add({ id: 'cus-99', name: 'Alguien más', aliases: [], contacts: [] })

    await importBackup(file)

    await expect(db.customers.count()).resolves.toBe(1)
    await expect(db.customers.get('cus-99')).resolves.toBeUndefined()
  })
})

describe('a malformed file', () => {
  it('rejects something that is not an object', async () => {
    await expect(importBackup('nope')).rejects.toBeInstanceOf(BackupFormatError)
    await expect(importBackup(null)).rejects.toBeInstanceOf(BackupFormatError)
  })

  it('rejects an unknown version', async () => {
    await expect(importBackup({ version: 2, campaigns: [], customers: [], orders: [], settings: [] })).rejects.toThrow(
      BackupFormatError,
    )
  })

  it('rejects a missing table', async () => {
    await expect(importBackup({ version: 1, campaigns: [], customers: [], orders: [] })).rejects.toBeInstanceOf(
      BackupFormatError,
    )
  })

  it('rejects a record with the wrong shape', async () => {
    const file = {
      version: 1,
      exportedAt: '2026-09-05T00:00:00.000Z',
      campaigns: [],
      customers: [],
      orders: [{ id: 'ord-1', campaignId: 'camp-13', customerId: 'cus-1', items: 'nope' }],
      settings: [],
    }
    await expect(importBackup(file)).rejects.toBeInstanceOf(BackupFormatError)
  })

  it('leaves the database untouched when the file is rejected', async () => {
    await seed()
    await expect(importBackup({ version: 9 })).rejects.toBeInstanceOf(BackupFormatError)
    await expect(db.orders.count()).resolves.toBe(1)
    await expect(db.customers.count()).resolves.toBe(1)
  })
})

describe('the customer contact log', () => {
  it('round trips', async () => {
    await seed()
    const file = JSON.parse(JSON.stringify(await exportBackup())) as BackupFile
    expect(file.customers[0]?.contacts).toEqual(['2026-09-02T00:00:00.000Z'])

    await resetDatabase()
    await importBackup(file)

    await expect(db.customers.get('cus-1')).resolves.toMatchObject({ contacts: ['2026-09-02T00:00:00.000Z'] })
  })

  it('imports a backup written before the contact log existed', async () => {
    const legacy = {
      version: 1,
      exportedAt: '2026-09-01T00:00:00.000Z',
      campaigns: [],
      customers: [{ id: 'cus-1', name: 'Ana', aliases: [] }],
      orders: [],
      settings: [],
    }
    await importBackup(legacy)
    await expect(db.customers.get('cus-1')).resolves.toMatchObject({ name: 'Ana', contacts: [] })
  })
})

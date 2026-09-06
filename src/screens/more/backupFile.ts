/**
 * The backup is the only thing between her and losing every record of who owes
 * her money: the browser can evict IndexedDB whenever it feels like it.
 */
import type { BackupFile } from '../../db/types'
import { daysBetween } from '../../domain'
import type { Status } from '../../ui'

export const LAST_BACKUP_KEY = 'backup.lastExportedAt'
export const BANK_ACCOUNT_KEY = 'bank.account'

/** Amber from here on, red from the second one. A campaign runs three weeks. */
const WARN_DAYS = 3
const STALE_DAYS = 7

export interface BackupAge {
  status: Status
  /** Days without a backup, shown as the big number. Absent today and never. */
  days?: number
  /** Replaces the number when there is none to show. */
  pill?: string
  /** The supporting line under the title. Never a sentence. */
  label?: string
}

export function backupAge(lastIso: string | undefined, today: string): BackupAge {
  if (!lastIso) return { status: 'owes', pill: 'Nunca' }

  const days = Math.max(0, daysBetween(lastIso, today))
  const status: Status = days >= STALE_DAYS ? 'owes' : days >= WARN_DAYS ? 'pending' : 'done'
  if (days === 0) return { status, pill: 'Hoy' }
  return { status, days, label: days === 1 ? 'día sin guardar' : 'días sin guardar' }
}

export function backupFileName(exportedAt: string): string {
  return `oriflame-${exportedAt.slice(0, 10)}.json`
}

/** Hands the JSON to the browser's download flow. Returns the file name. */
export function downloadBackup(file: BackupFile): string {
  const name = backupFileName(file.exportedAt)
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Safari needs the object URL alive while it starts the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return name
}

export async function readJsonFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text()) as unknown
}

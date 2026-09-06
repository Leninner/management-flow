/** Key-value store for message templates, bank details and preferences. */
import { db } from '../db/db'
import type { Setting } from '../db/types'

export function get(key: string): Promise<string | undefined>
export function get(key: string, fallback: string): Promise<string>
export async function get(key: string, fallback?: string): Promise<string | undefined> {
  const setting = await db.settings.get(key)
  return setting?.value ?? fallback
}

export async function set(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value })
}

export async function all(): Promise<Setting[]> {
  return db.settings.orderBy('key').toArray()
}

export async function remove(key: string): Promise<void> {
  await db.settings.delete(key)
}

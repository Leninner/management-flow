import { beforeEach, describe, expect, it } from 'vitest'
import * as settings from './settings'
import { resetDatabase } from './test-db'

beforeEach(resetDatabase)

describe('settings', () => {
  it('returns the fallback for a key that was never set', async () => {
    await expect(settings.get('template.confirmation', 'Hola!')).resolves.toBe('Hola!')
  })

  it('returns undefined without a fallback', async () => {
    await expect(settings.get('template.confirmation')).resolves.toBeUndefined()
  })

  it('reads back what it stored', async () => {
    await settings.set('bank.account', 'Pichincha 22012345')
    await expect(settings.get('bank.account', '')).resolves.toBe('Pichincha 22012345')
  })

  it('overwrites an existing key', async () => {
    await settings.set('bank.account', 'first')
    await settings.set('bank.account', 'second')
    await expect(settings.get('bank.account')).resolves.toBe('second')
  })

  it('lists everything it holds', async () => {
    await settings.set('a', '1')
    await settings.set('b', '2')
    await expect(settings.all()).resolves.toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ])
  })
})

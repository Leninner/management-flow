/**
 * Comparación contra el diseño. Siembra datos realistas en IndexedDB y recorre
 * las pantallas, incluidas las que sólo existen después de tocar algo.
 *
 * La pantalla Hoy se dispara en cuatro estados, porque es la que cambia de
 * forma: primer uso, todo en cero, campaña normal y cierre inminente.
 *
 *   pnpm dev                              # en otra terminal
 *   node scripts/design-check.mjs         # PORT=5174 si vite eligió otro
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = '/tmp/design-check'
const PORT = process.env.PORT ?? '5173'
const URL = `http://localhost:${PORT}/`
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` })
const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`CONSOLE: ${m.text()}`))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

/**
 * Siembra por IndexedDB en vez de manejar la UI: así el guion no se rompe cada
 * vez que se mueve un botón.
 */
async function seed(scenario) {
  await page.evaluate(async (scenario) => {
    const wipe = () =>
      new Promise((res) => {
        const r = indexedDB.deleteDatabase('oriflame-sales')
        r.onsuccess = res
        r.onerror = res
        r.onblocked = res
      })
    await wipe()
    if (scenario === 'first-run') return

    const open = () =>
      new Promise((res, rej) => {
        const r = indexedDB.open('oriflame-sales', 1)
        r.onupgradeneeded = () => {
          const dbh = r.result
          dbh.createObjectStore('campaigns', { keyPath: 'id' })
          dbh.createObjectStore('customers', { keyPath: 'id' })
          dbh.createObjectStore('orders', { keyPath: 'id' })
          dbh.createObjectStore('settings', { keyPath: 'key' })
        }
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
    const dbh = await open()
    const put = (store, rows) =>
      new Promise((res, rej) => {
        if (rows.length === 0) return res()
        const tx = dbh.transaction(store, 'readwrite')
        rows.forEach((row) => tx.objectStore(store).put(row))
        tx.oncomplete = res
        tx.onerror = () => rej(tx.error)
      })
    const d = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

    // "Todo en cero": campaña abierta, nadie ha comprado, tarjeta sin configurar.
    if (scenario === 'zero') {
      await put('campaigns', [{ id: 'c13', name: 'C13-2026', cutoffDate: d(31), active: true }])
      dbh.close()
      return
    }

    const cutoff = scenario === 'urgent' ? d(2) : d(12)
    await put('campaigns', [
      {
        id: 'c12',
        name: 'C12-2026',
        cutoffDate: d(-22),
        active: false,
        arrivedAt: d(-14),
        supplierInvoiceAmount: 90,
      },
      {
        id: 'c13',
        name: 'C13-2026',
        cutoffDate: cutoff,
        active: true,
        supplierInvoiceAmount: 180,
      },
    ])
    await put('customers', [
      { id: 'u1', name: 'María Fernanda', aliases: ['@maria23'], whatsapp: '0987654321', contacts: [] },
      { id: 'u2', name: 'Anita Toapanta', aliases: ['@anita_ec'], whatsapp: '0991122334', contacts: [] },
      { id: 'u3', name: 'Rosita Naranjo', aliases: [], whatsapp: '0955667788', address: 'Riobamba', contacts: [] },
      { id: 'u4', name: 'Karla Lligalo', aliases: ['@karlita'], whatsapp: '0977889900', contacts: [] },
      { id: 'u5', name: 'Jessica', aliases: ['@jessi_live'], contacts: [] },
    ])
    await put('orders', [
      { id: 'o1', campaignId: 'c13', customerId: 'u1', items: [
          { name: '38588 Novage Ecollagen', quantity: 2, price: 12.9 },
          { name: '42102 Labial The One', quantity: 1, price: 8.5 }],
        paidAmount: 10, shippingCost: 0, confirmed: true, contacts: [d(-3)], createdAt: d(-4) },
      { id: 'o2', campaignId: 'c13', customerId: 'u2', items: [
          { name: '38588 Novage Ecollagen', quantity: 1, price: 12.9 }],
        paidAmount: 0, shippingCost: 0, confirmed: false, contacts: [], createdAt: d(-2) },
      { id: 'o3', campaignId: 'c13', customerId: 'u3', items: [
          { name: '31234 Crema Milk & Honey', quantity: 3, price: 9.9 },
          { name: '30621 Optimals sin precio', quantity: 1, price: 0 }],
        paidAmount: 20, shippingCost: 5, confirmed: true, contacts: [], createdAt: d(-5) },
      { id: 'o4', campaignId: 'c12', customerId: 'u4', items: [
          { name: '42102 Labial The One', quantity: 2, price: 8.5 }],
        paidAmount: 0, shippingCost: 0, confirmed: true, contacts: [d(-10), d(-6)], createdAt: d(-25) },
    ])
    await put('settings', [
      { key: 'card.cutoffDay', value: '15' },
      { key: 'card.dueDay', value: '30' },
      { key: 'bank.account', value: 'Banco Pichincha\nAhorros 2201234567\nMaría Pérez · 1803456789' },
    ])
    dbh.close()
  }, scenario)

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
}

const step = async (name, fn) => {
  try {
    if (fn) await fn()
    await page.waitForTimeout(600)
    await shot(name)
    console.log(`ok   ${name}`)
  } catch (e) {
    console.log(`FALLA ${name}: ${e.message.split('\n')[0]}`)
    await shot(`${name}-FALLA`)
  }
}

// ---- Los cuatro estados de Hoy ------------------------------------------
await seed('first-run')
await step('00-hoy-primer-uso')

await seed('zero')
await step('01-hoy-en-cero')

await seed('normal')
await step('02-hoy-normal')

await seed('urgent')
await step('03-hoy-cierre-inminente')

// ---- El recorrido completo, sobre el estado normal ----------------------
await seed('normal')

await step('04-anotar-vacio', () => page.getByRole('button', { name: 'Anotar pedido' }).click())
await step('05-anotar-cliente', () => page.getByText('María', { exact: true }).first().click())
await step('06-anotar-producto-existente', async () => {
  await page.getByPlaceholder('Producto o código').fill('38588')
})
// María ya lleva 2 de este: tiene que tomar su propia fila, no abrir una segunda.
await step('06b-producto-repetido', async () => {
  await page.getByRole('button', { name: /38588 Novage Ecollagen.*la última vez/ }).click()
})
await step('07-anotar-producto-nuevo', async () => {
  await page.getByRole('button', { name: /^Descartar 38588/ }).click()
  await page.waitForTimeout(300)
  await page.getByPlaceholder('Producto o código').fill('90210 Crema nueva')
})
await step('08-anotado', async () => {
  await page.getByRole('button', { name: 'Anotar sin precio' }).click()
})
await step('08b-pedido-anotado', async () => {
  await page.getByRole('button', { name: /Anotar a/ }).click()
})
await step('09-anotar-cliente-nuevo', async () => {
  await page.getByRole('button', { name: 'Cambiar de cliente' }).click()
  await page.waitForTimeout(300)
  await page.getByPlaceholder('Nombre, @usuario o celular').fill('Jessica del live')
})

await step('10-pedidos', async () => {
  await page.getByRole('button', { name: 'Volver' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Pedidos' }).click()
})
await step('11-pedido-detalle', async () => {
  // Pedidos abre en "Sin confirmar", donde Rosita no está.
  await page.getByRole('button', { name: /Por cobrar/ }).first().click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Rosita/ }).first().click()
})
await step('12-pedido-menu', () => page.getByRole('button', { name: 'Más opciones' }).click())
await step('13-pedido-pagado', async () => {
  await page.getByRole('button', { name: 'Cerrar' }).last().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Pagó todo/ }).click()
})

await step('14-clientes', async () => {
  await page.getByRole('button', { name: 'Volver' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Clientes' }).click()
})
await step('14b-cliente-sin-deuda', () => page.getByRole('button', { name: /Jessica/ }).first().click())
await step('14c-cliente-datos', () => page.getByRole('button', { name: /Jessica/ }).first().click())
await step('14d-cliente-con-deuda', async () => {
  await page.getByRole('button', { name: 'Cerrar' }).last().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Volver' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Karla/ }).first().click()
})

await step('15-mas', async () => {
  await page.getByRole('button', { name: 'Volver' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Más', exact: true }).click()
})
await step('16-tarjeta', () => page.getByText('Mi tarjeta').click())
await step('17-editor-mensaje', async () => {
  await page.getByRole('button', { name: 'Cerrar' }).last().click()
  await page.waitForTimeout(300)
  await page.getByText('Cuenta y total').click()
})

console.log('\n===== ERRORES =====\n' + (errors.join('\n') || '(ninguno)'))
await browser.close()

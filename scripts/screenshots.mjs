/**
 * Visual review. Seeds a realistic campaign straight into IndexedDB, then
 * shoots every screen at phone size into /tmp/shots.
 *
 *   pnpm dev            # in another terminal
 *   pnpm shots
 *
 * Seeding through IndexedDB rather than driving the UI keeps this from
 * breaking every time a button moves.
 */
import { chromium } from 'playwright'

const OUT = '/tmp/shots'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` })
const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`CONSOLE: ${m.text()}`))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

// Sembrar por IndexedDB: la app ya creó la base con su esquema.
await page.evaluate(async () => {
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open('oriflame-sales')
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
  })
  const dbh = await open()
  const put = (store, rows) => new Promise((res, rej) => {
    const tx = dbh.transaction(store, 'readwrite')
    rows.forEach((row) => tx.objectStore(store).put(row))
    tx.oncomplete = res; tx.onerror = () => rej(tx.error)
  })
  const d = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

  await put('campaigns', [
    { id: 'c12', name: 'C12-2026', cutoffDate: d(-22), active: false, arrivedAt: d(-14), supplierInvoiceAmount: 41.2 },
    { id: 'c13', name: 'C13-2026', cutoffDate: d(2), active: true },
  ])
  await put('customers', [
    { id: 'u1', name: '@maria23', aliases: ['María Fernanda', '0987654321'], whatsapp: '0987654321', contacts: [] },
    { id: 'u2', name: '@anita_ec', aliases: [], whatsapp: '0991122334', contacts: [] },
    { id: 'u3', name: 'Rosita', aliases: [], whatsapp: '0955667788', address: 'Riobamba, Av. Daniel León Borja', contacts: [] },
    { id: 'u4', name: '@karlita', aliases: [], contacts: [] },
  ])
  await put('orders', [
    { id: 'o1', campaignId: 'c13', customerId: 'u1', items: [
        { code: '38588', name: 'Novage Ecollagen', quantity: 2, price: 12.9 },
        { code: '42102', name: 'Labial The One', quantity: 1, price: 8.5 }],
      paidAmount: 0, shippingCost: 0, contacts: [d(-3)], createdAt: d(-4) },
    { id: 'o2', campaignId: 'c13', customerId: 'u2', items: [
        { code: '38588', name: 'Novage Ecollagen', quantity: 1, price: 12.9 },
        { code: '50123', name: 'Gel de baño', quantity: 1 }],
      paidAmount: 0, shippingCost: 0, contacts: [], createdAt: d(-2) },
    { id: 'o3', campaignId: 'c13', customerId: 'u3', items: [
        { code: '31234', name: 'Crema Milk & Honey', quantity: 3, price: 9.9 },
        { code: '38588', name: 'Novage Ecollagen', quantity: 1, price: 12.9 }],
      paidAmount: 20, shippingCost: 5, contacts: [], createdAt: d(-5) },
    { id: 'o4', campaignId: 'c12', customerId: 'u4', items: [
        { code: '42102', name: 'Labial The One', quantity: 2, price: 8.5 }],
      paidAmount: 0, shippingCost: 0, contacts: [d(-10), d(-6)], createdAt: d(-25) },
  ])
  await put('campaignProducts', [
    { id: 'c13:38588', campaignId: 'c13', code: '38588', name: 'Novage Ecollagen', price: 12.9 },
    { id: 'c13:42102', campaignId: 'c13', code: '42102', name: 'Labial The One', price: 8.5 },
    { id: 'c13:31234', campaignId: 'c13', code: '31234', name: 'Crema Milk & Honey', price: 9.9 },
    { id: 'c13:50123', campaignId: 'c13', code: '50123', name: 'Gel de baño' },
  ])
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(900)

const dump = async (label) => console.log(`\n===== ${label} =====\n` + (await page.locator('body').innerText()).slice(0, 700))

await shot('01-pedidos'); await dump('PEDIDOS')

for (const [tab, file] of [['Oriflame', '02-oriflame'], ['Más', '03-mas']]) {
  await page.getByText(tab, { exact: true }).last().click()
  await page.waitForTimeout(700)
  await shot(file); await dump(tab)
}

// El pedido por dentro, que es donde se cobra.
await page.getByText('Pedidos', { exact: true }).last().click()
await page.waitForTimeout(600)
await page.getByText('@maria23', { exact: true }).first().click()
await page.waitForTimeout(700)
await shot('04-pedido'); await dump('PEDIDO')
// El detalle usa el mismo escritor de renglones que "Agregar pedido".
await page.getByLabel('Producto').fill('31234 ')
await page.getByLabel('Anotar el renglón').click()
await page.waitForTimeout(700)
await shot('04b-pedido-agrega'); await dump('PEDIDO + RENGLÓN')
await page.goBack()
await page.waitForTimeout(500)

// Agregar un pedido: se abre y se cierra como cualquier otra pantalla.
await page.getByText('Agregar pedido', { exact: true }).last().click()
await page.waitForTimeout(800)
await shot('05-agregar'); await dump('AGREGAR PEDIDO')

// Y el caso que se rompió: un código que la app nunca ha visto, sin nombre.
await page.getByLabel('Producto').fill('77123 ')
await page.waitForTimeout(300)
await page.getByLabel('Precio').fill('6.50')
await page.getByLabel('Anotar el renglón').click()
await page.waitForTimeout(700)
await shot('06-codigo-solo'); await dump('CÓDIGO SIN NOMBRE')

// El mismo código escrito de las dos formas tiene que caer en un solo renglón.
await page.getByLabel('Producto').fill('7898 Bálsamo')
await page.getByLabel('Precio').fill('45')
await page.getByLabel('Anotar el renglón').click()
await page.waitForTimeout(500)
await page.getByLabel('Producto').fill('7898')
await page.getByLabel('Anotar el renglón').click()
await page.waitForTimeout(700)
await shot('07-mismo-codigo'); await dump('MISMO CÓDIGO DOS VECES')

// Volver deja a Pedidos con el total ya movido.
await page.getByLabel('Volver').click()
await page.waitForTimeout(600)
await dump('DE VUELTA EN PEDIDOS')

// La pantalla del costo total.
await page.getByText('Oriflame', { exact: true }).last().click()
await page.waitForTimeout(600)
await page.getByText('¿Cuánto te costó?', { exact: true }).click()
await page.waitForTimeout(700)
await shot('07-costos'); await dump('COSTOS')

console.log('\n===== ERRORES =====\n' + (errors.join('\n') || '(ninguno)'))
await browser.close()

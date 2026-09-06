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
    { id: 'c12', name: 'C12-2026', cutoffDate: d(-22), active: false, arrivedAt: d(-14) },
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
        { name: '38588 Novage Ecollagen', quantity: 2, price: 12.9 },
        { name: '42102 Labial The One', quantity: 1, price: 8.5 }],
      paidAmount: 0, shippingCost: 0, confirmed: true, contacts: [d(-3)], createdAt: d(-4) },
    { id: 'o2', campaignId: 'c13', customerId: 'u2', items: [
        { name: '38588 Novage Ecollagen', quantity: 1, price: 12.9 }],
      paidAmount: 0, shippingCost: 0, confirmed: false, contacts: [], createdAt: d(-2) },
    { id: 'o3', campaignId: 'c13', customerId: 'u3', items: [
        { name: '31234 Crema Milk & Honey', quantity: 3, price: 9.9 },
        { name: '38588 Novage Ecollagen', quantity: 1, price: 12.9 }],
      paidAmount: 20, shippingCost: 5, confirmed: true, contacts: [], createdAt: d(-5) },
    { id: 'o4', campaignId: 'c12', customerId: 'u4', items: [
        { name: '42102 Labial The One', quantity: 2, price: 8.5 }],
      paidAmount: 0, shippingCost: 0, confirmed: true, contacts: [d(-10), d(-6)], createdAt: d(-25) },
  ])
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(900)

const dump = async (label) => console.log(`\n===== ${label} =====\n` + (await page.locator('body').innerText()).slice(0, 600))

await shot('04-hoy'); await dump('HOY')

for (const [tab, file] of [['Pedidos','05-pedidos'], ['Clientes','06-clientes'], ['Más','07-mas']]) {
  await page.getByText(tab, { exact: true }).last().click()
  await page.waitForTimeout(700)
  await shot(file); await dump(tab)
}

console.log('\n===== ERRORES =====\n' + (errors.join('\n') || '(ninguno)'))
await browser.close()

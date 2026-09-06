/**
 * Comparación contra el diseño. Siembra una campaña realista en IndexedDB y
 * recorre las pantallas rediseñadas, incluidas las que sólo existen después de
 * tocar algo (producto nuevo, menú de borrar, editor de mensaje).
 *
 *   pnpm dev            # en otra terminal
 *   node scripts/design-check.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = '/tmp/design-check'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` })
const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`CONSOLE: ${m.text()}`))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

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
    { id: 'u1', name: 'María Fernanda', aliases: ['@maria23'], whatsapp: '0987654321', contacts: [] },
    { id: 'u2', name: 'Anita Toapanta', aliases: ['@anita_ec'], whatsapp: '0991122334', contacts: [] },
    { id: 'u3', name: 'Rosita Naranjo', aliases: [], whatsapp: '0955667788', address: 'Riobamba', contacts: [] },
    { id: 'u4', name: 'Karla Lligalo', aliases: ['@karlita'], whatsapp: '0977889900', contacts: [] },
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
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(900)

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

await step('01-hoy')
await step('02-anotar-vacio', () => page.getByRole('button', { name: 'Anotar pedido' }).click())
await step('03-anotar-cliente', () => page.getByText('María', { exact: true }).first().click())
await step('04-anotar-producto-existente', async () => {
  await page.getByPlaceholder('Producto o código').fill('38588')
})
await step('05-anotar-producto-nuevo', async () => {
  await page.getByPlaceholder('Producto o código').fill('90210 Crema nueva')
  await page.getByRole('button', { name: /Nuevo:/ }).click()
})
await step('06-anotar-sin-precio', async () => {
  await page.getByRole('button', { name: 'Todavía no sé el precio' }).click()
})
await step('07-anotado', async () => {
  await page.getByRole('button', { name: /Anotar a/ }).click()
})

await step('08-pedidos', async () => {
  await page.getByRole('button', { name: 'Volver' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Pedidos' }).click()
})
await step('09-pedido-detalle', async () => {
  await page.getByRole('button', { name: /Rosita/ }).first().click()
})
await step('10-pedido-menu', () => page.getByRole('button', { name: 'Más opciones' }).click())
await step('11-pedido-pagado', async () => {
  await page.getByRole('button', { name: 'Cerrar' }).first().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Pagado/ }).click()
})

await step('12-clientes', async () => {
  await page.getByRole('button', { name: 'Volver' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Clientes' }).click()
})
await step('13-mas', () => page.getByRole('button', { name: 'Más', exact: true }).click())
await step('14-editor-mensaje', () => page.getByText('Cuenta y total').click())

console.log('\n===== ERRORES =====\n' + (errors.join('\n') || '(ninguno)'))
await browser.close()

## 1. Lenguaje visual

- [x] 1.1 Reescribir los tokens de `src/styles.css`: fondo blanco, borde de un pelo, acento violeta suave, escala de radios, escala de espaciado de a 4px, token de transición
- [x] 1.2 Quitar la sombra de `Card` y reemplazarla por borde; conservar sombra solo en `BigButton` flotante y `Sheet`
- [x] 1.3 Aplanar `TabBar`: fondo blanco, borde superior de un pelo, sin sombra, conservando los labels
- [x] 1.4 Bajar el peso de los títulos estructurales en `SectionHeader` y `AppShell`, sin tocar el peso de `Money`

## 2. Primitivas de entrada

- [x] 2.1 Crear `src/ui/Field.tsx`: envoltorio con label, caja de 56px, foco, error
- [x] 2.2 Crear `src/ui/TextField.tsx` sobre `Field`, cubriendo text, tel y date, con `onSubmit` en Enter
- [x] 2.3 Crear `src/ui/MoneyField.tsx` migrando `sanitizeAmount` y `parseAmount` desde `src/screens/orders/fields.tsx`
- [x] 2.4 Crear `src/ui/TextArea.tsx` migrando la versión de `src/screens/more/fields.tsx`
- [x] 2.5 Crear `src/ui/Select.tsx` con `<select>` nativo estilado como `Field`
- [x] 2.6 Exportar toda la familia desde `src/ui/index.ts`

## 3. Botón, cifra y estado vacío

- [x] 3.1 Crear `src/ui/Button.tsx` con `size` md/lg y variantes primary/quiet/danger/ghost
- [x] 3.2 Reescribir `BigButton` sobre `Button` conservando su API pública intacta
- [x] 3.3 Crear `src/ui/Stat.tsx` con `StatGrid` de dos columnas, tono de estado, variante apagada y acción opcional
- [x] 3.4 Agregar variante `compact` a `EmptyState`

## 4. Migrar pantallas a las primitivas

- [x] 4.1 Migrar `src/screens/capture/` y borrar `src/screens/today/TextField.tsx`
- [x] 4.2 Migrar `src/screens/orders/` y borrar `src/screens/orders/fields.tsx`
- [x] 4.3 Migrar `src/screens/more/` y `src/screens/customers/`, dejando en `more/fields.tsx` solo `ErrorNote` y `Chip`
- [x] 4.4 Verificar que no queda ninguna definición de campo fuera de `src/ui`

## 5. Dominio de la plata

- [x] 5.1 Agregar `supplierInvoiceAmount?: number` a `Campaign` en `src/db/types.ts`
- [x] 5.2 Escribir `src/domain/finances.test.ts` con los escenarios del spec `campaign-finances`, antes de la implementación
- [x] 5.3 Implementar `src/domain/finances.ts`: `campaignProfitCents`, `campaignSoldCents`, `collectedCents`, `toRecoverCents`, `nextCardCutoff`
- [x] 5.4 Exportar desde `src/domain/index.ts` y dejar `pnpm test` en verde

## 6. Ajustes de la tarjeta

- [x] 6.1 Definir las claves `card.cutoffDay` y `card.dueDay` y sus lectores tipados
- [x] 6.2 Agregar la sección Tarjeta en `src/screens/More.tsx` con dos `Select` de día del mes
- [x] 6.3 Permitir anotar la factura de la campaña desde `EditCampaignSheet`

## 7. Pantalla Hoy

- [x] 7.1 Reducir `CampaignHeader` a una línea y dejar que escale a alarma solo con tres días o menos
- [x] 7.2 Construir el bloque 2×2 de `Stat` con ganancia, por cobrar, por recuperar y corte de tarjeta
- [x] 7.3 Apagar en gris los cuadrantes en cero o sin dato configurado
- [x] 7.4 Cablear cada cuadrante a su destino y dejar abajo solo la fila de por entregar
- [x] 7.5 Usar el estado vacío compacto en la lista de pendientes

## 8. Captura en vivo

- [x] 8.1 En `CustomerStep`, ocultar crear cuando la búsqueda no devuelve coincidencias y avanzar con lo escrito
- [x] 8.2 Materializar el cliente nuevo recién al anotar, y descartarlo si se cambia de cliente antes
- [x] 8.3 En `ProductStep`, tomar lo escrito tal cual cuando no hay coincidencias en el historial
- [x] 8.4 Mostrar bajo el producto lo que el cliente ya lleva en la campaña activa

## 9. Verificación

- [x] 9.1 `pnpm test` en verde
- [x] 9.2 `pnpm lint` y `pnpm build` sin errores
- [x] 9.3 Extender `scripts/design-check.mjs`: sembrar factura y ajustes de tarjeta, y capturar Hoy en cuatro estados —primer uso, todo en cero, campaña normal, cierre inminente
- [x] 9.4 Correr el recorrido de Playwright, revisar las capturas y confirmar que no hay errores de consola

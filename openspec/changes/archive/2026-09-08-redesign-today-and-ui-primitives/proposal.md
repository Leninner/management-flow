## Why

La pantalla Hoy no responde las preguntas por las que ella abre la app. Muestra en grande un número que no importa (31 días para el corte) y esconde abajo la plata, que es lo único que la hace abrir la app dos veces al día. Además no puede responder tres preguntas que sí tiene todos los días —cuánto está ganando, cuánto le falta recuperar de lo que pagó con la tarjeta, y cuándo corta esa tarjeta— porque esos datos no existen en el modelo.

Por debajo, `src/ui` no es una capa de primitivas: hay tres implementaciones distintas de `TextField` viviendo en carpetas de pantallas, no existe `Select`, no existe un botón que no sea el héroe flotante, y la ley visual del proyecto ("números grandes, texto chico") se repite a mano en cada pantalla en vez de ser un componente. Cada pantalla nueva empeora la deriva.

Y la captura en vivo obliga a tocar "Crear a X" y "Nuevo: X" incluso cuando no hay absolutamente nada que elegir, que es el momento en que ella está hablando frente a una cámara.

## What Changes

**Lenguaje visual**

- Fondo blanco en lugar del lavanda `#f7f5fc`, y separación por borde de un pelo en lugar de sombra. Las sombras se retiran de tarjetas y filas; sobrevive solo la del botón héroe y la de las hojas.
- Radios más grandes y consistentes, escala de espaciado de a 4px con aire generoso, y pesos de letra más livianos en los títulos estructurales. Los montos siguen gruesos: la ley "números grandes, texto chico" no se toca.
- Acento violeta más suave, usado con cuentagotas. Los colores de estado se conservan íntegros pero se aplican en puntos, montos y píldoras chicas, no en tarjetas rellenas.
- Transiciones compartidas para los estados de presión, respetando `prefers-reduced-motion`.

**Primitivas de UI**

- Nueva familia `Field` en `src/ui`: `TextField`, `MoneyField`, `TextArea`, `Select`.
- **BREAKING (interno)**: se borran `src/screens/today/TextField.tsx`, `src/screens/orders/fields.tsx` y los controles de `src/screens/more/fields.tsx`. Las tres copias pasan a una.
- Nuevo `Button`: el botón que no es el héroe (tamaños md/lg, variantes primary/quiet/danger/ghost, no flotante). `BigButton` conserva su API pública y pasa a construirse encima.
- Nuevos `Stat` y `StatGrid`: número grande + etiqueta chica + tono + tap. Convierte la ley visual en componente.
- `EmptyState` gana variante `compact`, para que una lista vacía dentro de una pantalla no se coma el centro.
- No se toca la API de `Row`. La usan cuatro pantallas y el problema reportado no es ese.

**Plata de la campaña**

- `Campaign` gana `supplierInvoiceAmount?: number`: lo que facturó Oriflame, que es lo que ella pagó con la tarjeta.
- Nuevos ajustes `card.cutoffDay` y `card.dueDay`: día del mes, configurados una vez.
- Nuevo módulo puro `src/domain/finances.ts`: ganancia de campaña, cobrado, falta por recuperar, próximo corte de tarjeta.
- Nueva sección Tarjeta en Más. La factura se anota desde Hoy o desde Más → Campaña.

**Pantalla Hoy**

- El corte de campaña baja a una línea compacta y solo escala a alarma de ancho completo cuando faltan ≤3 días.
- Bloque 2×2 de `Stat` arriba: ganancia, por cobrar, falta recuperar, corte de tarjeta.
- En cero los cuadrantes se apagan a gris en vez de gritar `$0.00` en rojo.
- "Por cobrar" deja de ser fila y pasa al 2×2; abajo queda solo "Por entregar".

**Captura en vivo**

- "Crear a X" y "Nuevo: X" solo aparecen cuando hay resultados de los que distinguirse. Sin coincidencias no hay nada que elegir y el paso desaparece: lo escrito se toma tal cual.
- Se cierra el vacío entre los datos y el botón Anotar.

## Capabilities

### New Capabilities

- `ui-primitives`: la capa de controles compartidos —campos, botón, select, stat, estados vacíos—, el lenguaje visual que comparten (superficie, borde, radio, peso, espaciado, movimiento) y las reglas de tamaño, contraste y área táctil que todos cumplen.
- `campaign-finances`: ganancia por campaña, recuperación de lo pagado con la tarjeta, y el calendario de corte de esa tarjeta.
- `today-dashboard`: qué responde la pantalla de inicio, en qué orden, y cómo se comporta cuando todo está en cero.
- `live-capture`: el flujo de anotar durante el live, incluyendo cuándo se crea un cliente o un producto sin pedir confirmación.

### Modified Capabilities

Ninguna. `openspec/specs/` está vacío: este es el primer change del proyecto.

## Impact

**Código**

- `src/ui/`: archivos nuevos (`Field`, `TextField`, `MoneyField`, `TextArea`, `Select`, `Button`, `Stat`), `EmptyState` y `BigButton` modificados, `index.ts` reexporta.
- `src/screens/`: se borran tres archivos de campos; Capture, Orders, Customers, More y sus sheets migran a las primitivas.
- `src/db/types.ts`: un campo opcional en `Campaign`.
- `src/domain/finances.ts`: módulo nuevo, puro, con tests.
- `src/screens/Today.tsx` y `src/screens/today/`: reescritura de la composición.
- `scripts/design-check.mjs`: siembra factura y ajustes de tarjeta; captura Hoy en cuatro estados.

**Datos**

- El campo nuevo es opcional y el respaldo JSON existente sigue importando sin migración. Un respaldo viejo simplemente no trae factura, y la pantalla lo trata como "todavía no llegó".

**Invariantes que no se tocan**

Un pedido por cliente por campaña; totales calculados, nunca guardados; precio copiado dentro del ítem; fechas como strings ISO; aritmética en centavos enteros; la app no manda mensajes sola.

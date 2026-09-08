## Context

La app funciona y los invariantes de dominio están bien puestos: totales calculados, precio copiado dentro del ítem, plata en centavos enteros, fechas como strings ISO. El problema está una capa más arriba.

`src/ui` nació como carpeta de componentes, no como capa de primitivas. La prueba es que hay tres `TextField` distintos —`screens/today/TextField.tsx`, `screens/orders/fields.tsx`, `screens/more/fields.tsx`— cada uno con markup levemente diferente, y los tres comentan que viven ahí "hasta que `src/ui` tenga una primitiva real". Nunca la tuvo. No hay `Select` en toda la app, y el único botón es `BigButton`, que mide 58px, se porta por `createPortal` al fondo de la pantalla y está pensado para ser el único de la vista.

En paralelo, la usuaria pide que la pantalla de inicio responda cuatro preguntas de las cuales tres no tienen datos detrás: cuánto gana, cuánto le falta recuperar de lo que puso con su tarjeta de crédito, y cuándo corta esa tarjeta.

## Goals / Non-Goals

**Goals:**

- Una sola implementación por control, en `src/ui`, sin copias en carpetas de pantallas.
- Que Hoy responda plata de un vistazo, sin leer y sin navegar.
- Que la ganancia y la deuda de la tarjeta salgan de **un solo dato** que ella anota una vez por campaña.
- Que anotar en vivo no pida confirmaciones que no desambiguan nada.

**Goals (visuales):**

- Un lenguaje visual simple y minimalista: fondo blanco, separación por borde de un pelo, radios generosos, aire, y acento usado con cuentagotas.

**Non-Goals:**

- No se cambia la API de `Row`. La usan Pedidos, Clientes, Más y OrderDetail, y no es lo que se reportó.
- No se agrega tabla de productos ni catálogo. El autocompletado sigue saliendo del historial.
- No hay backend, no hay sincronización, no hay notificaciones push.

## Decisions

### El borde reemplaza a la sombra

Hoy la separación entre tarjeta y fondo la hace un fondo lavanda más una sombra violeta. Pasa a hacerla un borde de 1px sobre blanco. Es la diferencia entre una interfaz que parece apilada y una que parece impresa, y bajo el sol de Ambato un borde sobrevive donde una sombra suave desaparece.

La sombra no se elimina del sistema: sobrevive donde comunica jerarquía real —el botón héroe, que flota sobre el contenido, y las hojas, que tapan la pantalla—. En una tarjeta que no se levanta de ningún lado, era decoración.

### Los pesos bajan, los montos no

Los títulos estructurales pasan de 700 a 600 y 500. Un tablero donde todo grita no tiene jerarquía. Lo que **no** baja es la plata: los montos y las cantidades siguen gruesos y grandes, porque la primera ley del proyecto es que cada pantalla responda "cuánto" y "cuántos" antes de que ella lea una palabra.

### El color de estado se conserva, pero se aplica en dosis chicas

El referente visual es casi incoloro. Acá no se puede: rojo debe, ámbar falta entregar y verde listo son la forma en que ella lee la pantalla sin leerla, y están en los invariantes del proyecto.

La conciliación es de superficie, no de significado. Los tonos saturados dejan de rellenar tarjetas enteras y se concentran en el punto de estado, en el monto y en píldoras chicas. La tarjeta de fondo queda blanca. Se conserva la regla de contraste que ya estaba documentada: ámbar y verde solo pasan AA en texto grande, así que en tipografía chica siguen usando sus variantes oscurecidas.

### Los labels de la barra inferior se quedan

El referente usa solo íconos. Se descarta: la usuaria no es técnica y un ícono sin palabra es una adivinanza. El criterio del proyecto —si ella duda, el diseño está mal— gana sobre la fidelidad al referente. Lo que sí se adopta es aplanar la barra: blanca, borde superior de un pelo, sin sombra.

### La ganancia sale de la factura, no de un porcentaje

Alternativas consideradas: porcentaje fijo de consultora (30%), costo por producto en cada ítem, o estimado que se corrige al llegar la factura.

Se elige **un número por campaña**: `Campaign.supplierInvoiceAmount`, lo que le facturó Oriflame. Gana porque es el mismo número que la deuda de la tarjeta —ella paga esa factura con su tarjeta— así que un solo dato alimenta las dos respuestas y las dos siempre cuadran entre sí. El costo por producto se descartó porque duplicaría el trabajo dentro de la pantalla de captura, que es justo la que tiene que sobrevivir un live. El porcentaje fijo se descartó porque produce una ganancia que nunca coincide con lo que la tarjeta le cobra de verdad, y una app de plata que dice dos números distintos deja de usarse.

### El envío no cuenta como ganancia

La ganancia usa `orderSubtotal` (solo ítems), no `orderTotal`. El flete entra del cliente y sale al courier: es plata de paso. Incluirlo le diría que gana más de lo que gana, y en un negocio que se maneja al margen eso es una decisión de compra equivocada.

La recuperación de la tarjeta, en cambio, sí usa todo lo abonado. Ahí la pregunta es de caja —cuánta plata volvió— y la plata del flete también sirve para pagar la tarjeta.

### Sin factura no hay ganancia, y se dice

Consecuencia directa de la decisión anterior: durante las ~3 semanas previas al corte la factura todavía no existe. En vez de inventar un estimado, el cuadrante muestra **`VENDÍ $492`** y al llegar la factura pasa a **`GANO $312`**. Tocarlo abre el campo donde se anota. Es honesto y además le da el motivo para anotarla.

### La recuperación de la tarjeta acumula todas las campañas

`toRecoverCents` suma `max(0, factura − cobrado)` sobre **toda** campaña que tenga factura anotada, no solo la activa. Una campaña vieja mal cobrada sigue siendo plata que ella puso y no le volvió, y la tarjeta no distingue catálogos. El piso por campaña evita que una campaña sobre-cobrada tape el hueco de otra.

Esto la deja en el mismo alcance que "Por cobrar", que ya sumaba todas las campañas por la misma razón.

### Dos relojes, dos verbos

La campaña corta cada ~3 semanas; la tarjeta corta cada mes. No se alinean nunca y ponerlos con la misma palabra los vuelve indistinguibles. Queda: **el catálogo cierra**, **la tarjeta corta**. El corte de campaña vive en la línea de encabezado y solo escala a alarma roja de ancho completo con ≤3 días, reutilizando el `URGENT_DAYS` que ya existe.

### El corte de tarjeta es un día del mes, no una fecha

`card.cutoffDay` y `card.dueDay` son enteros 1–31 guardados en `settings`. `nextCardCutoff` los proyecta a la próxima fecha real. Un día 31 en un mes de 30 se recorta al último día del mes: es lo que hacen los bancos y es lo que ella espera. Se configura una vez y no se vuelve a tocar, que es lo contrario de anotar una fecha por campaña y olvidarse.

### `Select` es el `<select>` nativo

Un dropdown propio con lista virtual se ve mejor en escritorio y es peor en el celular: el nativo abre la rueda de iOS, que ella maneja con el pulgar sin apuntar. Se estila la caja, no la lista.

### `BigButton` conserva su API

Doce pantallas lo importan. Se extrae un `Button` con `size` y `variant`, y `BigButton` pasa a ser `Button` con `size="lg"` y `floating` por defecto. Cero cambios en los llamadores, una sola definición de estilos.

### Crear solo existe cuando hay de qué distinguirse

La regla original —crear es el camino silencioso, elegir es el ruidoso— existe para que la misma persona no termine dos veces en la app con la plata partida. Sigue siendo correcta, pero solo se sostiene **cuando hay algo que elegir**. Si lo escrito no coincide con nadie, no hay duplicado posible y el botón "Crear a X" es un toque que no decide nada.

Queda: con coincidencias, crear sigue siendo explícito y las coincidencias van arriba. Sin coincidencias, lo escrito se toma tal cual y el cliente se materializa recién al tocar Anotar. Lo mismo para el producto contra el historial.

## Risks / Trade-offs

**La ganancia queda muda buena parte de la campaña** → El cuadrante dice `VENDÍ` en lugar de quedarse vacío, y tocarlo lleva a anotar la factura. Es el precio de no mentir con un estimado; fue la elección explícita de la usuaria.

**Cuatro cifras arriba pueden volverse sopa** → Se apagan a gris cuando valen cero, así que en la práctica casi nunca hay cuatro números encendidos a la vez. La captura que motivó este change tenía `$0.00` en rojo con un badge `0`, que es ruido gritado.

**Auto-crear cliente puede generar duplicados por error de tipeo** → Solo ocurre cuando la búsqueda no devuelve **ninguna** coincidencia sobre nombre, alias y whatsapp. Un tipeo que se parezca a alguien existente cae en el camino con coincidencias, donde crear sigue siendo explícito. Y la fusión de clientes ya existe como red.

**Migrar cinco pantallas a las primitivas puede romper algo silenciosamente** → `pnpm test` cubre dominio y datos; la verificación visual es `scripts/design-check.mjs`, que recorre las pantallas con Playwright y falla ruidosamente si un selector desaparece.

**Queda espacio muerto sobre el botón Anotar** → Se reduce mostrando bajo el producto lo que ese cliente ya tiene en la campaña activa (que además hace visible el invariante de un pedido por cliente), pero no se elimina: el botón se queda pegado abajo. Que no se mueva vale más que llenar el hueco, porque el pulgar lo busca siempre en el mismo lugar mientras ella habla a cámara.

## Migration Plan

El único cambio de datos es `Campaign.supplierInvoiceAmount`, opcional. No hay migración de Dexie: un registro sin el campo se lee como `undefined` y la pantalla lo trata como "todavía no llegó la factura". Un respaldo JSON exportado antes de este change importa sin tocar nada.

Los ajustes `card.cutoffDay` y `card.dueDay` viven en la tabla `settings`, que ya es un key-value libre. Sin configurar, el cuadrante de tarjeta se apaga.

## Open Questions

Ninguna. Las tres decisiones abiertas —origen de la ganancia, configuración de la tarjeta y reparto de la pantalla— se cerraron con la usuaria antes de escribir esto.

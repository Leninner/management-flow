# Oriflame — rediseño total

Fecha: 2026-09-08
Estado: diseño aprobado, pendiente plan de implementación
Reemplaza en lo que contradiga a `2026-09-05-oriflame-ventas-live-design.md`. Todo lo que ese documento decidió y este no menciona sigue vigente.

## Por qué se rehace

La app funciona y aun así anotar un pedido cuesta demasiado. Tres fallas concretas, medidas contra el código actual:

**Anotar es un wizard de dos pasos.** `CustomerStep` es una grilla de caritas: se toca una y la pantalla no cambia de forma, la tarjeta se queda igual de grande y no hay señal de que algo pasó. Después el producto es otro paso, y cada línea necesita un botón grande abajo. Tres toques por producto, dos de ellos inventados.

**La confirmación es fricción mental pura.** Si ella lo anotó, el pedido existe. `Order.confirmed` obliga a volver después a tocar un botón que no le dice nada nuevo, y de paso hace que `campaignSoldCents` no cuente lo no confirmado: hoy la ganancia miente hacia abajo sin avisar.

**No hay ninguna respuesta a "cuánto gano".** El diseño anterior dejó márgenes fuera de V1 a propósito. Ya no se puede: sin costo por producto no se puede decidir a qué precio vender, y decidir el precio es la mitad del negocio.

## Decisiones

**La confirmación desaparece del modelo.** No se esconde, se borra. Anotado es confirmado.

**Anotar es el primer tab y es donde abre la app.** Era una vista apilada detrás de un botón. Es la acción más frecuente del negocio y la única que ocurre bajo presión de tiempo.

**Clientes deja de ser un destino.** Se entra a una persona buscándola desde Pedidos. Un directorio alfabético de clientes es una pantalla que nadie abre por sí sola; la ficha, los alias, la fusión y el borrado siguen existiendo enteros.

**El costo llega tarde y es por producto y por campaña.** Ella no sabe lo que le cuesta un producto hasta que paga en Oriflame. Todo tiene que funcionar completo sin costo, y la ganancia aparece sola cuando el costo llega. Nunca se estima con un porcentaje: un número inventado es peor que ningún número, porque contra ese número se compra el catálogo siguiente.

**El precio de venta se rebaja por cliente, no por producto.** Vender el 38588 a $16 es un favor a una persona, no una decisión del catálogo. Vive dentro del ítem del pedido de esa persona, que es donde el precio ya vivía.

**Los precios cambian entre campañas.** El autocompletado actual saca el precio del último ítem vendido alguna vez, así que en campaña nueva rellena con el precio viejo y nadie se entera. Se corrige con `CampaignProduct`.

## Excepción a las leyes visuales

El CLAUDE.md dice "nada de tablas". La pantalla de costos de Oriflame es una tabla y va a seguir siéndolo.

La ley existe para las pantallas que ella usa apurada, con una mano, frente a cámara. Esta es la única que usa sentada, con las dos manos, comparando columna contra columna con la pantalla de Oriflame abierta al lado mientras paga. Ahí una lista de tarjetas obliga a recordar el número de la tarjeta anterior. La tabla no es pereza de diseño; es la forma correcta para el único momento de la app que no es apurado.

Se documenta como excepción nombrada en el CLAUDE.md. La ley sigue aplicando a todo lo demás.

## Modelo de datos

### `OrderItem`: el código se separa del nombre

```ts
OrderItem {
  code?,      // "38588". Ausente en ítems viejos y en lo que se vende sin código.
  name,       // "Novage Ecollagen"
  quantity,
  price?,     // foto del precio al que se le vendió A ESTA PERSONA
}
```

`price` es opcional por la misma razón que `cost`: un dato que todavía no se sabe se deja ausente, nunca en cero. Un cero es un precio y miente en cada suma. Los totales suman lo que tiene precio y la pantalla dice cuántos productos están sin él, igual que hace la ganancia con los costos. `orderSubtotalCents`, `orderBalance` y la consolidación tienen que devolver el parcial más la cuenta de lo que falta, no un número solo.

`code` es lo que habilita copiar al pedido rápido de Oriflame, agrupar sin depender de cómo se escribió el nombre, y abrir la ficha pública del producto. Es opcional porque forzarlo rompería los ítems que ya existen y frenaría una venta durante un live.

### `CampaignProduct`: tabla nueva

```ts
CampaignProduct {
  id,          // `${campaignId}:${code}`
  campaignId,
  code,
  name,
  price,       // PVP de ESTA campaña
  cost?,       // lo que le cuesta a ella. Ausente hasta que paga.
}
```

Por qué una tabla y no derivarlo de los ítems ya vendidos: si el PVP de la campaña saliera del último ítem, rebajarle a María le movería el precio a Ana. Y el costo, que es por producto y por campaña, no tendría dónde vivir.

### `Order`: `confirmed` se borra

Sale el campo y sale su índice. Consecuencias que hay que ejecutar, no solo declarar:

- `Orders` pasa de cuatro filtros a tres: por cobrar, por entregar, listos.
- `campaignSoldCents` deja de filtrar por `confirmed` y empieza a contar todo.
- El toggle "sacar los sin confirmar del pedido a Oriflame" desaparece. Lo reemplaza un dato sin interruptor: cuánto del pedido es de gente que no ha abonado nada. Borrar una línea suelta sigue estando.
- `OrderSteps` pierde su primer paso. Quedan pagado y entregado.
- La plantilla "Pedir que confirme" no se borra, se reencuadra: ya no pregunta por un estado interno, es el primer WhatsApp después del live.

### Invariante nuevo

**Vender por debajo del costo se permite y se pinta rojo.** A veces se regala margen a propósito; lo que no puede pasar es que ella no se entere.

### La factura de campaña se queda

`Campaign.supplierInvoiceAmount` sobrevive: es lo que la tarjeta cobró de verdad, con envíos, impuestos y promociones adentro, y es de donde sale `toRecoverCents`. La suma de los costos por línea es otra cosa: lo que suman los productos. Cuando las dos existen y no cuadran, la diferencia se muestra como "otros cargos". Nunca se reparte a la fuerza entre las líneas.

### Migración Dexie v1 → v2

1. `orders`: se borra `confirmed` de cada registro y del esquema de índices.
2. `OrderItem.name` se parte con una expresión regular de 5 o 6 dígitos al inicio. Lo que parsea deja `code` y `name` separados; lo que no, se queda entero en `name` con `code` ausente.
3. `campaignProducts` se siembra desde los ítems existentes de cada campaña: por cada código, el precio más frecuente. `cost` queda ausente.

La migración corre una vez y es idempotente. El respaldo JSON sube a `version: 2` y el importador acepta los dos.

## Pantallas

Barra inferior de cuatro: **Anotar · Pedidos · Oriflame · Más**.

### Anotar

```
┌──────────────────────────────────┐
│ ●María   Ana   Lucía   Rosa    🔍│
├──────────────────────────────────┤
│ MARÍA                      48.00 │
│ 38588 Novage      1   19.00   ✕ │
│ 42102 Labial      2    9.90   ✕ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 385│                         │ │
│ └──────────────────────────────┘ │
│ 38588 Novage Ecollagen     19.00 │
│ 38102 Crema Milk & Honey   12.50 │
│ + producto nuevo "385"           │
└──────────────────────────────────┘
```

**Elegir cliente cambia la forma de la pantalla.** La grilla de caritas colapsa a una tira de una sola línea con scroll horizontal, el elegido pasa al frente y relleno, su nombre se vuelve cabecera con su total, el campo de producto toma foco y sube el teclado. Ese cambio visible es el arreglo: hoy no pasa nada y por eso parece que no se seleccionó.

**Tocar una sugerencia mete la línea y limpia el campo.** No hay botón de confirmar producto. Un toque por producto.

**Quitar es la ✕ de la fila, sin confirmación.** Borrar algo recién puesto es la acción más común de esta pantalla; pedir confirmación la castiga. Lo que sí se confirma es borrar un pedido entero, y eso vive en otra pantalla.

Cantidad: se toca el número y salen `−`/`+` en la misma fila. `38588 x3` escrito también funciona.

**Falta el precio es un estado legítimo.** Un producto nuevo se anota sin precio y queda marcado; el marcador se ve en Pedidos y en Oriflame. Durante un live nada la frena por un dato que puede poner después.

**Primera vez de un producto en la campaña**: el precio aparece en gris con el valor de la campaña anterior, como dato a confirmar y no como valor puesto. Se toca o se corrige una vez y ese producto ya tiene precio para esta campaña.

Cliente nuevo: se escribe un nombre que no existe y sale "+ crear". Un campo, nada más.

El buscador de la esquina abre la búsqueda de personas a pantalla completa, para cuando la tira no alcanza.

### Pedidos

Absorbe Hoy y Clientes.

De arriba abajo: buscador que encuentra personas y pedidos · campaña y días al corte · "Escríbele a" con la lista de seguimiento, que desaparece sola cuando está vacía · tres filtros · la lista.

Dentro del pedido de una persona, cada ítem tiene su ✕ y **su precio editable ahí mismo**. Ese es el "quiero venderle a 16 en vez de 19", y vive en el pedido de la persona porque la rebaja es a la persona.

Tocar una persona en el buscador abre su ficha: historial, deuda arrastrada, alias, fusionar, borrar.

### Oriflame

Un tab, tres momentos de la misma campaña.

**Antes del corte — qué pedir.** El consolidado por producto con `[Copiar códigos]` y `[Abrir carrito de Oriflame]` juntos. Debajo, cuánto del pedido es de gente que no ha abonado nada.

**Al pagar — poner costos.**

```
        cant   me cuesta    cobro     gano
38588     5     [14.25]     95.00   +23.75
42102     3     [ 7.43]     29.70   + 7.41
31234     2     [     ]     25.00       —
──────────────────────────────────────────
Pago a Oriflame                     96.66
Cobro a clientes                   154.80
Gano si vendo todo                 +58.14   (faltan 3 costos)
```

El costo se escribe por unidad, que es como Oriflame lo muestra. `cobro` es la suma real de lo que cada cliente va a pagar por ese producto, con las rebajas ya adentro, no `cantidad × PVP`. **La ganancia se muestra parcial mientras falten costos y dice cuántos faltan.** Nunca se completa con una estimación.

**Después — historial.** Al cerrar la campaña la tabla se congela y baja al mismo tab.

```
ANTERIORES
C12-2026   pagué 87.40 · cobré 110.20 · gané +22.80 · falta 14.00  ▸
C11-2026   pagué 74.10 · cobré 105.15 · gané +31.05                ▸
```

"Falta" es lo que los clientes de esa campaña todavía deben. Una campaña con ganancia positiva y saldo pendiente es exactamente el caso que este negocio pierde de vista.

### Más

Igual que hoy. No se le agrega nada.

## Seguimiento

Las reglas dejan de mirar `confirmed` y miran contacto, pago y entrega.

| Situación | Dispara a los | Plantilla |
|---|---|---|
| Anotado, nunca contactado | 1 día | Avisar lo anotado |
| Sin pagar | 2 días | Pedir el pago |
| Sin pagar y faltan 3 días al corte | inmediato | Avisar del cierre |
| Abonó a medias | 3 días | Recordar el saldo |
| Mercadería llegó, sin entregar | 2 días | Avisar que llegó |
| Entregado hace 3 semanas | una vez | Ofrecer de nuevo |
| Cliente frecuente sin pedido esta campaña | 3 días antes del corte | Invitar al live |

Prioridad cuando varias disparan: corte > llegó > saldo > pago > primer aviso > reenganche > recompra. El tope de dos seguimientos por pedido se queda.

## APIs de Oriflame

### Lo que no se va a hacer

El portal `we-test-api-portal.oriflame.com` es Azure API Management en entorno de pruebas, con registro para partners de Oriflame previa aprobación, no para consultoras. Y aunque hubiera credenciales: **una API key dentro de una PWA cliente puro está publicada** — cualquiera abre el bundle y la lee. Usar la API implica un backend, y el backend rompe la decisión que hace que esta app cueste cero y funcione sin internet.

Si algún día hay acceso y una spec OpenAPI, se reevalúa con datos. Hoy no hay nada que evaluar desde afuera.

### Lo que sí se hace, sin backend

1. **`[Copiar códigos]`** en el formato del pedido rápido: `código⇥cantidad`, una línea por producto, listo para pegar en `ec.oriflame.com/shopping/basket`.
2. **`[Abrir carrito]`** al lado, que lleva ahí con el portapapeles ya cargado. Un toque menos entre decidir y pagar.
3. **Ficha pública del producto** por línea: `ec.oriflame.com/products/product?code=38588` responde sin login. Verificado con el código 48904, que devuelve "Cosmetiquera Plateada Novage+" a $19.90 contra $40.00 normal. Sirve para confirmar nombre y precio sin adivinar.

No existe ninguna forma pública de precargar el carrito con varios códigos por URL. El pedido rápido es código por código y el pegado final es a mano.

### Lo que queda anotado y no se hace todavía

Un proxy de unas treinta líneas en Vercel, donde ya se despliega, que lea esa página pública y devuelva `{ code, name, price }`. Con eso se escribe `38588` y aparecen nombre y precio de campaña reales, y el autocompletado deja de depender del historial. Es el mayor golpe de fricción disponible y también el primero que rompe la promesa de no tener servidor. Además es scraping de HTML: se rompe cuando Oriflame cambie el marcado, y hay que mirar sus términos antes.

## Testing

Sigue Vitest con fake-indexeddb, y la lógica pura sigue separada de React.

Lo que hay que probar y no existe hoy:

- La migración v1 → v2: partir el nombre en código y nombre, sembrar `campaignProducts`, y correrla dos veces sin cambiar nada la segunda.
- El precio de campaña: el mismo código en dos campañas con precios distintos no se contamina, y rebajarle a un cliente no le mueve el precio a otro.
- La ganancia con costos incompletos: parcial, con la cuenta de los que faltan, y nunca estimada.
- Un ítem sin precio: no cuenta como cero en ningún total, y el saldo del cliente avisa que está incompleto.
- Vender por debajo del costo: se guarda y se marca.
- La factura de campaña contra la suma de costos: la diferencia sale como otros cargos y no se reparte.
- El formato de copiado al pedido rápido.
- Los disparadores de seguimiento sin `confirmed`.

Lo que ya está probado se mantiene: un pedido por cliente por campaña, fusión de clientes, consolidación, tope de seguimientos, exportar e importar sin pérdida.

## Fuera de alcance

El proxy de catálogo, la API de Oriflame, y todo lo que el documento anterior ya dejó fuera y este no rescata: pool de compra colectiva, puntos y niveles, captura automática de comentarios del live, subastas, link público de comprobantes, reconciliación de pedidos incompletos, armado de fundas, inventario, varias campañas abiertas a la vez y gestión de red.

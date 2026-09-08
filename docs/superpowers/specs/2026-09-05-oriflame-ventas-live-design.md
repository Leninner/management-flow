# Oriflame — gestión de ventas por live de TikTok

Fecha: 2026-09-05
Estado: diseño aprobado, pendiente plan de implementación

## Problema

Una consultora Oriflame en Ambato vende por lives de TikTok. Hoy lleva todo en la cabeza y en WhatsApp. Con 10 clientes ya se pierden ventas en tres puntos: el que comenta en el live y nunca vuelve a escribir, el que pide y no paga, y el pedido que no alcanzó a entrar antes de la fecha de corte de la campaña.

La app no busca escalar el negocio. Busca que no se caiga nada.

## Contexto del negocio

Ecuador no tiene TikTok Shop, así que todo el flujo es manual: se muestra el producto en el live, la gente comenta el código Oriflame, y la venta se cierra por WhatsApp. En el live no se dice "dólares" ni se habla de precios, porque TikTok restringe lives comerciales no marcados como promocionales.

La campaña es el latido del negocio. Cada catálogo dura unas tres semanas y tiene una fecha de corte para meter el pedido consolidado a Oriflame. Lo que no entra antes del corte espera al siguiente catálogo.

Entregas: en Ambato en mano, a otras ciudades por courier.
Cobros: transferencia con captura del comprobante, Deuna, y efectivo contra entrega. La app no procesa pagos, solo registra su estado.

## Usuaria

La mamá del desarrollador. No es técnica. Usa la app desde su celular, con una mano, mientras habla frente a cámara. Este es el criterio que gana sobre cualquier otro: si ella se traba, la funcionalidad está mal diseñada por más correcta que sea por dentro.

## Decisiones de arquitectura

**PWA cliente puro, sin backend.** Vite + React 19 + Dexie (IndexedDB) + Tailwind 4 + Vitest. Sin servidor, sin costo, funciona sin internet. Sigue el stack que el desarrollador ya usa en liderboard.

**Un solo dispositivo.** Los datos viven en el celular de ella. No hay sincronización entre aparatos y no se va a fingir que la hay.

**El respaldo exportable es obligatorio, no opcional.** El navegador puede desalojar la IndexedDB: limpiar datos del sitio, poca memoria, reinstalar la PWA. Sin respaldo se pierde el registro de quién debe plata. Al instalar se pide `navigator.storage.persist()` y se avisa si el navegador no lo concede.

**Sin notificaciones push.** Una PWA sin backend no puede notificar con la app cerrada. Se usa `navigator.setAppBadge()` para el globito con la cuenta de pendientes, y la pantalla de inicio hace de lista de tareas del día.

## Modelo de datos

Tres tablas. Ítems, pagos y entrega van embebidos en el pedido porque un pedido se edita como una unidad.

```ts
Campaign {
  id, nombre,          // "C13-2026"
  fechaCorte,
  fechaLlegada?,       // cuando llegó la mercadería de Oriflame
  activa
}

Customer {
  id, nombre,
  alias: string[],     // ["@maria23", "0987654321", "Mafer"]
  whatsapp?, direccion?,
  contactos: Date[]    // seguimientos a la persona, no a un pedido
}

Order {
  id, campaignId, customerId,
  items: [{ nombre, cantidad, precio }],
  abonado: number,        // 0 = no ha pagado nada
  costoEnvio: number,     // 0 = entrega en Ambato
  confirmado: boolean,    // capturado en live = false
  fechaEntrega?: Date,    // sin valor = no entregado
  contactos: Date[],      // cada "ya le escribí"
  creadoEn, notas?
}
```

### Reglas del modelo

**No hay tabla de productos.** Cargar el catálogo Oriflame antes de poder vender sería la peor fricción posible. El autocompletado sale del historial de ítems: ella escribe `38588` y aparece "38588 Novage — $12.90" de la última vez que lo vendió. El catálogo se construye solo y no se mantiene nunca.

**El precio se copia dentro del ítem.** `precio` es una foto del momento de la venta. Sin esto, cambiar un precio en la campaña siguiente reescribe lo que la gente ya te debe.

**Los totales se calculan, no se guardan.** `subtotal`, `pagado` y `saldo` salen de sumar ítems y pagos. Un total guardado se desincroniza al editar un ítem, y en un sistema de plata eso es veneno.

**Un pedido por cliente por campaña.** Si el cliente ya tiene pedido en la campaña activa, los ítems nuevos se suman a ese pedido. Nunca se crea un segundo. Esto resuelve solo: pidió tres veces en el live, y pidió en el live y después por WhatsApp. Un total, un cobro, un envío. Sin esta regla se paga flete dos veces.

**`fechaEntrega` y `contactos` guardan fechas, no banderas.** Una bandera `entregado: true` no permite disparar la recompra a las tres semanas, y un `ultimoContacto` suelto no permite contar cuántas veces ya se insistió. Cada uno es un solo campo y cubre las dos preguntas.

**La búsqueda de clientes pega contra `nombre`, `alias` y `whatsapp`.** La venta empieza en TikTok como @maria23 y se cierra en WhatsApp como María Fernanda desde el 098. Los alias unen las dos identidades.

**Fusionar clientes.** Los duplicados van a pasar igual. Se eligen dos, se quedan los datos de uno, los alias se juntan y los pedidos se consolidan; si ambos tenían pedido en la misma campaña, los ítems se combinan.

## Pantallas

Barra inferior de cuatro destinos: Hoy, Pedidos, Clientes, Más. Sin menús anidados.

### 1. Hoy (inicio)

Lo primero que se ve al abrir:

```
Campaña C13 — corte en 2 días

HOY (4)
  María @maria23     sin confirmar, 2 días    [WhatsApp] [ya escribí]
  Ana 0987...        confirmó, no ha pagado   [WhatsApp] [ya escribí]

Por cobrar    $84.50   (5)
Por entregar           (3)

              [ Capturar pedido ]
```

### 2. Captura (modo live)

La pantalla crítica. Regla que la gobierna: **durante el live solo se captura qué y quién.** Nada de plata, nada de direcciones, nada de entregas. Eso se marca después desde otra pantalla. Un campo de pago aquí es lo que hace que ella se trabe frente a cámara.

Flujo: buscar cliente (lista filtrable, "crear nuevo" es secundario y pide solo un nombre) → escribir producto (autocompletado trae el precio) → cantidad por defecto 1 → Enter. Tres toques.

Debajo, siempre visible, la lista de lo capturado en este live para poder corregir sin salir.

### 3. Pedidos

Lista filtrable por estado: sin confirmar, por cobrar, por entregar, completos. Cada uno abre al detalle donde se registra el abono, se marca entregado y se edita ítems.

### 4. Clientes

Ficha con historial. Muestra la deuda arrastrada de campañas anteriores: "debe $18 de la campaña pasada". La plata que se pierde en este negocio casi siempre es de alguien a quien ya le habías fiado antes.

### 5. Pedido a Oriflame

La salida más valiosa de la app. Al llegar el corte, consolida todos los pedidos por producto:

```
PEDIDO CAMPAÑA C13 — 12 clientes
 5x  38588  Novage Ecollagen
 3x  42102  Labial The One
 2x  31234  Crema Milk & Honey
 Total: 10 unidades          [ Copiar ]
```

Sin esto ella abre 12 pedidos y suma a mano. Si pide 4 en vez de 5, alguien se queda sin producto.

### Más

Datos de cuenta bancaria, tarjeta, campaña, plantillas de mensajes y, al final, respaldo
(exportar e importar). Entra a configurar lo suyo, no a administrar una base de datos: el
respaldo es una tarea de mantenimiento y va último, con su botón grande al alcance del pulgar.

### Primer uso

Estado vacío que no pide configurar nada: "¿Cómo se llama la campaña? ¿Cuándo es el corte?" Dos campos y ya está capturando. Si el primer uso pide más que eso, no vuelve a abrir la app.

## Identidad visual

El criterio es que se entienda de un vistazo, sin leer. Ella la usa apurada, en el celular, a veces con luz de sol encima.

**Números grandes, texto chico.** Cada pantalla responde "cuánto" y "cuántos" antes que cualquier otra cosa. El monto y la cantidad son lo más grande de la fila; el nombre del cliente va segundo; todo lo demás es apoyo.

**El color es el estado.** Tres colores que se aprenden una vez, en lugar de nueve palabras que hay que leer cada vez.

- rojo: debe plata
- ámbar: falta entregar
- verde: listo

**Un botón principal por pantalla**, grande, abajo, al alcance del pulgar.

**Nada de tablas.** Filas tipo tarjeta. Las tablas obligan a leer encabezados para entender una celda.

**Nada de texto explicativo.** Sin tooltips, sin ayudas, sin párrafos de instrucciones. Si una pantalla necesita explicarse, está mal diseñada.

Paleta de partida, a refinar en implementación:

```
fondo    #FDFBF7   crema, menos reflejo que el blanco puro
tinta    #1C1917   casi negro cálido
acento   #7C2D5A   ciruela; no choca con los colores de estado
debe     #DC2626
entrega  #D97706
listo    #16A34A
```

Tipografía base mínima 17px, área táctil mínima 48px, contraste AA.

## Plantillas de mensajes

Editables por ella. Variables: `{cliente}`, `{items}`, `{total}`, `{saldo}`, `{corte}`, `{dia}`, `{cuenta}`. Estas son punto de partida, no su voz.

**Un solo nombre por mensaje**, y es el de abajo: el mismo en la lista de Más, en el título del editor y en el botón del pedido que lo va a mandar. Son verbos porque en los tres lugares lo que ella necesita saber es qué va a decir. Ninguno se llama "Confirmar pedido": la pantalla del pedido ya tiene un botón así que confirma sin escribirle a nadie.

**Pedir que confirme** (capturado en el live, sin confirmar)
> Hola {cliente}! Te anoté esto del live:
> {items}
> Son {total}. ¿Te lo confirmo?

**Preguntar la entrega**
> {cliente}, ¿lo retiras aquí en Ambato o te lo mando?
> Si es envío pásame la dirección con una referencia y a qué nombre.

**Pedir el pago**
> {cliente}, quedó en {total}.
> {cuenta}
> Cuando hagas la transferencia me mandas la captura y te confirmo.

**Avisar del cierre**
> {cliente}, el catálogo cierra el {corte}. Si querías aumentar algo dime hasta ahí, después ya no alcanzo a meterlo en este pedido.

**Recordar el saldo**
> {cliente}, de tu pedido quedan {saldo}. Sin apuro, es para no perderme la cuenta.

**Avisar que llegó**
> {cliente}, ya llegó tu pedido. ¿Cuándo te queda bien pasar a retirarlo?

**Ofrecer de nuevo**
> Hola {cliente}, ya salió el catálogo nuevo. Me acordé de ti porque llegó algo parecido a lo que llevaste, ¿te mando la foto?

**Invitar al live**
> {cliente}, ¿cómo has estado? Hago live este {dia} por si te quieres ver algo. Si prefieres te paso el catálogo por aquí.

"Preguntar la entrega" es el único que no tiene disparador: sale sólo del botón del pedido, cuando está pagado, sin entregar y la campaña todavía no llega.

No hay plantilla de despacho. La tenía, con `{courier}` y `{guia}`, y no la usaba nadie: ninguna de las dos funciones que eligen plantilla la nombraba y no existe dónde guardar un courier ni un número de guía, así que los dos huecos habrían salido vacíos. Si algún día se manda por courier, primero se guarda el dato.

El botón abre WhatsApp con el mensaje ya escrito (`wa.me`). La app no lee WhatsApp, no manda sola y no usa bots. Ella revisa y manda.

## Seguimiento

Las reglas miden días desde el último elemento de `contactos`, no desde la fecha del pedido. Ella toca "ya le escribí" y ese cliente sale de la lista de hoy. Sin eso la app le repite los mismos diez nombres todos los días y deja de mirarla en una semana.

| Situación | Dispara a los | Plantilla |
|---|---|---|
| Capturado en live, sin confirmar | 1 día | Pedir que confirme |
| Confirmado, sin pagar | 2 días | Pedir el pago |
| Sin pagar y faltan 3 días al corte | inmediato | Avisar del cierre |
| Abonó a medias | 3 días | Recordar el saldo |
| Mercadería llegó, sin entregar | 2 días | Avisar que llegó |
| Entregado hace 3 semanas | una vez | Ofrecer de nuevo |
| Cliente frecuente sin pedido esta campaña | 3 días antes del corte | Invitar al live |

Definiciones que los disparadores necesitan y no son obvias:

- **Cliente frecuente**: compró en al menos dos de las últimas tres campañas.
- **Deuda arrastrada**: suma de saldos de sus pedidos en campañas que ya no están activas.
- **Mercadería llegó**: la campaña tiene `fechaLlegada`.

**Tope de dos seguimientos por pedido.** Se cuenta con `contactos.length`.

**Un solo seguimiento por pedido a la vez.** La fila de "Hoy" tiene un botón de WhatsApp y un botón no puede llevar tres plantillas. Cuando varias reglas disparan, el orden es: corte > llegó > saldo > pago > confirmación > reenganche > recompra. El deadline gana sobre la plata, la plata gana sobre el mantenimiento.

**El reenganche apunta a un cliente, no a un pedido**, así que su "ya le escribí" se registra en `Customer.contactos`. Sin eso el mismo nombre reaparece los tres días previos al corte. Después sale solo de la lista. Insistir quema clientes, y es mejor perder una venta que perder una clienta.

## Errores y casos borde

- Cliente duplicado: se detecta al crear y se ofrece fusionar.
- Producto que no está en el historial: se crea al vuelo desde la captura, sin salir de la pantalla.
- Pedido cancelado: se borra. A esta escala no vale un estado más.
- Cambio de campaña: los pedidos sin confirmar se ofrecen mover a la siguiente o borrar.
- Importar respaldo: reemplaza todo, con confirmación explícita. No fusiona.
- `navigator.storage.persist()` denegado: se avisa y se insiste con el respaldo.
- Oriflame manda incompleto: ella borra el ítem y el total se recalcula. La pantalla dedicada de reconciliación queda fuera de V1.

## Testing

Vitest con fake-indexeddb, igual que en liderboard.

La lógica pura va separada de React y es lo que más se prueba: cálculo de totales, saldo y deuda arrastrada; la regla de un pedido por cliente por campaña; fusión de clientes con consolidación de pedidos; disparadores de seguimiento contra fechas fijas; consolidación del pedido a Oriflame; el tope de dos seguimientos; y el ciclo exportar-importar sin pérdida.

## Fuera de V1

Pool de compra colectiva, puntos y niveles Oriflame, captura automática de comentarios del live, subastas y dinámicas, link público para que la clienta suba su comprobante, reconciliación de pedidos incompletos, vista de armado de fundas, reportes y gráficas, inventario de bodega, márgenes y ganancia, varias campañas abiertas a la vez, y gestión de red de consultoras.

Ninguna entra hasta que la app esté probada en un live real.

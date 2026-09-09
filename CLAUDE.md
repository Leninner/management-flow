# oriflame

PWA para gestionar las ventas de una consultora Oriflame que vende por lives de TikTok en Ambato, Ecuador.

El diseño aprobado está en `docs/superpowers/specs/2026-09-05-oriflame-ventas-live-design.md`, y el rediseño que lo actualiza en `docs/superpowers/specs/2026-09-08-rediseno-total-design.md`. **Léelos antes de tocar nada**, el segundo primero: casi toda decisión no obvia de este repo está justificada ahí.

## Regla de idioma

- **Todo el código en inglés**: identificadores, tipos, funciones, archivos, comentarios, nombres de tests.
- **Todo el texto que ve la usuaria en español** ecuatoriano, informal y corto.

## Quién usa esto

La mamá del desarrollador. No es técnica. Usa la app con una mano, en el celular, apurada, a veces mientras habla frente a una cámara en vivo. **Si ella duda, el diseño está mal.** Este criterio gana sobre cualquier otro.

## Invariantes que no se rompen

- **Un pedido por cliente por campaña.** Un ítem nuevo para un cliente que ya tiene pedido en la campaña activa se suma a ese pedido. Nunca se crea un segundo. Romper esto hace pagar flete dos veces y cobrar a medias.
- **No hay confirmación.** Si ella lo anotó, el pedido existe. `Order.confirmed` se eliminó en la v2 del esquema; no vuelve.
- **Los totales se calculan, nunca se guardan.** Un total guardado se desincroniza al editar un ítem.
- **El precio se copia dentro del ítem.** Cambiar precios en una campaña nueva no puede reescribir lo que la gente ya debe. Rebajarle a una clienta tampoco puede mover el precio de otra.
- **Un dato que no se sabe se deja ausente, nunca en cero.** Vale para `OrderItem.price` y para `CampaignProduct.cost`. Un cero es un precio y miente en cada suma; un ausente se cuenta y se reporta. Todo total que pueda estar incompleto se muestra con cuántos le faltan.
- **No hay costo por producto.** Ella no sabe lo que le cuesta un producto hasta que paga, y pedirle veinte números es pedirle que no lo haga. Lo que la tarjeta cobró por todo el pedido vive en `Campaign.supplierInvoiceAmount` y el margen es una resta. Nada se estima con un porcentaje: contra ese número compra el catálogo siguiente.
- **Las fechas se guardan como strings ISO**, nunca como `Date`. El respaldo JSON es la única protección contra que el navegador desaloje la IndexedDB, y `Date` no sobrevive un round-trip por JSON.
- **Aritmética de dinero en centavos enteros.** Nada de sumar floats.
- **La app no manda mensajes sola.** Solo abre WhatsApp con el texto escrito; ella revisa y manda.

## Leyes visuales

1. Números grandes, texto chico.
2. El color es el estado: rojo debe, ámbar falta un dato o falta entregar, verde listo. El violeta no es estado: es marca, y marca el código Oriflame.
3. Un botón principal por pantalla, abajo, al alcance del pulgar.
4. Nada de tablas. Filas tipo tarjeta. Un pedido se dibuja como una hoja de factura: encabezado, un renglón por producto y los totales al pie tras una regla de tinta.
5. Nada de texto explicativo. Si una pantalla necesita explicarse, está mal diseñada.

## Superficie

Fondo lavanda (`paper`) con hojas blancas (`card`) encima: el tinte es lo que separa, así que una hoja no lleva borde, sólo `shadow-sheet`. Un pedido se dibuja siempre como la misma hoja, la escriba o la cobre.

Tres destinos abajo: **Pedidos · Oriflame · Más**, con íconos. La app abre en Pedidos, y su único botón es **Agregar pedido**.

Escribir un pedido es una pantalla que se abre y se cierra, no un tab: como tab era el mismo pedido dibujado dos veces, una para escribirlo y otra para cobrarlo. Ahí vive la tira de clientas — durante un live compran las mismas ocho personas una y otra vez, y cambiar entre ellas tiene que costar un toque sin salir de la pantalla.

## Estructura

```
src/db/        tipos del dominio y esquema Dexie
src/domain/    lógica pura, sin Dexie ni React. Aquí van los tests que importan.
src/data/      repositorios sobre Dexie
src/content/   plantillas de mensajes y helpers de WhatsApp
src/ui/        primitivas visuales
src/screens/   pantallas
```

## Comandos

```
pnpm dev      pnpm test      pnpm build      pnpm lint
```

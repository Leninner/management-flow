# oriflame

PWA para gestionar las ventas de una consultora Oriflame que vende por lives de TikTok en Ambato, Ecuador.

El diseño aprobado está en `docs/superpowers/specs/2026-09-05-oriflame-ventas-live-design.md`. **Léelo antes de tocar nada**: casi toda decisión no obvia de este repo está justificada ahí.

## Regla de idioma

- **Todo el código en inglés**: identificadores, tipos, funciones, archivos, comentarios, nombres de tests.
- **Todo el texto que ve la usuaria en español** ecuatoriano, informal y corto.

## Quién usa esto

La mamá del desarrollador. No es técnica. Usa la app con una mano, en el celular, apurada, a veces mientras habla frente a una cámara en vivo. **Si ella duda, el diseño está mal.** Este criterio gana sobre cualquier otro.

## Invariantes que no se rompen

- **Un pedido por cliente por campaña.** Un ítem nuevo para un cliente que ya tiene pedido en la campaña activa se suma a ese pedido. Nunca se crea un segundo. Romper esto hace pagar flete dos veces y cobrar a medias.
- **Los totales se calculan, nunca se guardan.** Un total guardado se desincroniza al editar un ítem.
- **El precio se copia dentro del ítem.** Cambiar precios en una campaña nueva no puede reescribir lo que la gente ya debe.
- **Las fechas se guardan como strings ISO**, nunca como `Date`. El respaldo JSON es la única protección contra que el navegador desaloje la IndexedDB, y `Date` no sobrevive un round-trip por JSON.
- **Aritmética de dinero en centavos enteros.** Nada de sumar floats.
- **La app no manda mensajes sola.** Solo abre WhatsApp con el texto escrito; ella revisa y manda.

## Leyes visuales

1. Números grandes, texto chico.
2. El color es el estado: rojo debe, ámbar falta entregar, verde listo.
3. Un botón principal por pantalla, abajo, al alcance del pulgar.
4. Nada de tablas. Filas tipo tarjeta.
5. Nada de texto explicativo. Si una pantalla necesita explicarse, está mal diseñada.

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

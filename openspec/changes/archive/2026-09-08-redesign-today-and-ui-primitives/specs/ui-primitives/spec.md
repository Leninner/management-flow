## ADDED Requirements

### Requirement: La superficie se separa con borde, no con sombra

El fondo de la app SHALL ser blanco. Las tarjetas y filas SHALL separarse del fondo con un borde de un pixel, y NO SHALL usar sombra. La sombra SHALL reservarse para lo que flota de verdad: el botón héroe y las hojas.

#### Scenario: Tarjeta en una pantalla

- **WHEN** se renderiza una `Card`
- **THEN** tiene borde de un pixel y no tiene sombra

#### Scenario: Botón héroe

- **WHEN** se renderiza un `BigButton` anclado al fondo
- **THEN** conserva su sombra, porque flota sobre el contenido que se desplaza debajo

#### Scenario: Barra inferior

- **WHEN** se renderiza la barra de pestañas
- **THEN** es blanca, con borde superior de un pixel y sin sombra

### Requirement: Radios y espaciado consistentes

Los radios SHALL salir de tokens compartidos y no de valores sueltos por componente. El espaciado SHALL seguir una escala de múltiplos de 4px.

#### Scenario: Dos tarjetas de pantallas distintas

- **WHEN** se comparan una tarjeta de Hoy y una de Pedidos
- **THEN** tienen exactamente el mismo radio, tomado del mismo token

#### Scenario: Control con forma de píldora

- **WHEN** se renderiza un botón, una píldora de estado o un chip
- **THEN** usa el token de radio completo y no un valor propio

### Requirement: Los títulos aflojan el peso, la plata no

Los títulos estructurales SHALL usar pesos medios en lugar de negrita máxima. Los montos y las cantidades SHALL conservar su peso grueso y su tamaño grande.

#### Scenario: Encabezado de sección

- **WHEN** se renderiza un `SectionHeader`
- **THEN** su título usa un peso medio, no el más grueso disponible

#### Scenario: Monto en una fila

- **WHEN** se renderiza un `Money` en tamaño grande
- **THEN** conserva peso grueso, cifras tabulares y es el elemento más prominente de la fila

### Requirement: El color de estado se usa en dosis chicas

Los tonos saturados de estado SHALL aplicarse en puntos, montos y píldoras, y NO SHALL rellenar el fondo de una tarjeta entera, salvo la tarjeta de alarma del cierre inminente. En tipografía chica los estados ámbar y verde SHALL usar sus variantes oscurecidas.

#### Scenario: Fila con saldo pendiente

- **WHEN** una fila representa un pedido con deuda
- **THEN** el fondo de la tarjeta es blanco y el rojo aparece en el punto de estado y en el monto

#### Scenario: Texto chico sobre relleno tenue

- **WHEN** se renderiza texto de 15px con estado ámbar o verde
- **THEN** usa la variante oscurecida del tono, no la saturada

### Requirement: Movimiento compartido y respetuoso

Los estados de presión SHALL usar una transición compartida desde tokens, y SHALL desactivarse cuando el sistema pide movimiento reducido.

#### Scenario: Se presiona un botón

- **WHEN** la usuaria mantiene presionado un botón
- **THEN** responde con la transición compartida definida en los tokens

#### Scenario: Movimiento reducido activado

- **WHEN** el sistema operativo pide movimiento reducido
- **THEN** ninguna transición de presión se ejecuta

### Requirement: Un solo control por tipo de entrada

`src/ui` SHALL exponer exactamente una implementación de cada control de entrada. Ninguna carpeta bajo `src/screens` SHALL definir su propio campo de texto, área de texto, campo de monto o select.

#### Scenario: No quedan campos duplicados en pantallas

- **WHEN** se buscan definiciones de componentes de entrada fuera de `src/ui`
- **THEN** no existe ningún `TextField`, `TextArea`, `AmountField` ni `Select` declarado bajo `src/screens`

#### Scenario: Una pantalla necesita texto libre

- **WHEN** una pantalla necesita que la usuaria escriba texto
- **THEN** importa `TextField` desde `src/ui` y no declara markup de input propio

### Requirement: Área táctil y legibilidad mínimas

Todo control interactivo de `src/ui` SHALL medir al menos 48px de alto en su área tocable, y todo texto que la usuaria lee SHALL medir al menos 17px.

#### Scenario: Campo de texto

- **WHEN** se renderiza cualquier control de la familia `Field`
- **THEN** su caja mide al menos 48px de alto y su texto al menos 17px

#### Scenario: Botón secundario

- **WHEN** se renderiza un `Button` con `size="md"`
- **THEN** mide al menos 48px de alto

### Requirement: Selección con el control nativo

`Select` SHALL usar un elemento `<select>` nativo del navegador. El componente estiliza la caja, y no SHALL reemplazar la lista de opciones por una implementación propia.

#### Scenario: Elegir un día del mes

- **WHEN** la usuaria toca un `Select` en el celular
- **THEN** se abre el selector nativo del sistema operativo

#### Scenario: El valor elegido vuelve al llamador

- **WHEN** la usuaria elige una opción
- **THEN** `onChange` recibe el valor de esa opción

### Requirement: Botón que no es el héroe

`src/ui` SHALL exponer un `Button` con tamaños `md` y `lg` y variantes `primary`, `quiet`, `danger` y `ghost`, que por defecto no se ancla al fondo de la pantalla.

#### Scenario: Botón dentro de una hoja

- **WHEN** una hoja necesita un botón de acción
- **THEN** usa `Button` y el botón queda en el flujo del contenido, sin portarse al fondo de la pantalla

#### Scenario: `BigButton` mantiene su contrato

- **WHEN** una pantalla existente renderiza `BigButton` sin cambiar sus props
- **THEN** se comporta igual que antes: 58px de alto, anclado al fondo por defecto

### Requirement: Número grande con etiqueta chica

`src/ui` SHALL exponer un `Stat` que muestre un valor grande sobre una etiqueta corta, con tono de estado opcional y acción opcional al tocarlo, y un `StatGrid` que los distribuya en dos columnas.

#### Scenario: Cifra con acción

- **WHEN** un `Stat` recibe `onClick`
- **THEN** se renderiza como control tocable con área de al menos 48px

#### Scenario: Cifra apagada

- **WHEN** un `Stat` recibe `muted`
- **THEN** el valor se pinta en gris neutro y no usa ningún color de estado

### Requirement: Estado vacío que no domina la pantalla

`EmptyState` SHALL ofrecer una variante compacta para listas vacías que viven dentro de una pantalla junto a otro contenido.

#### Scenario: Lista de pendientes vacía dentro de Hoy

- **WHEN** se renderiza `EmptyState` con `compact`
- **THEN** ocupa una fracción del alto de la variante completa y no desplaza el contenido que va debajo fuera de la pantalla

### Requirement: El campo de monto nunca produce NaN

`MoneyField` SHALL descartar cualquier carácter que no sea dígito o separador decimal, SHALL admitir como máximo dos decimales, y SHALL exponer un parseo que devuelve indefinido cuando no hay número usable.

#### Scenario: Se escribe una letra

- **WHEN** la usuaria escribe `12a.5` en un `MoneyField`
- **THEN** el campo muestra `12.5`

#### Scenario: Se escriben tres decimales

- **WHEN** la usuaria escribe `12.345`
- **THEN** el campo muestra `12.34`

#### Scenario: Campo vacío

- **WHEN** el campo está vacío
- **THEN** el parseo devuelve indefinido y quien lo usa puede deshabilitar su botón

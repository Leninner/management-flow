## ADDED Requirements

### Requirement: Hoy responde la plata antes que nada

La pantalla de inicio SHALL mostrar, sobre la lista de pendientes, cuatro cifras en una retícula de dos columnas: la ganancia de la campaña activa, el monto por cobrar, el monto por recuperar de la tarjeta, y cuándo corta la tarjeta.

#### Scenario: Campaña en curso

- **WHEN** se abre Hoy con una campaña activa
- **THEN** las cuatro cifras aparecen arriba, antes de cualquier lista

#### Scenario: Cada cifra lleva a algún lado

- **WHEN** la usuaria toca una de las cuatro cifras
- **THEN** se abre la vista que la explica: la factura de la campaña, los pedidos por cobrar, los pedidos por cobrar, y los ajustes de la tarjeta

### Requirement: La ganancia se muestra como vendido mientras no haya factura

Mientras la campaña activa no tenga factura anotada, el cuadrante de ganancia SHALL mostrar el total vendido rotulado como vendido. Al anotar la factura SHALL pasar a mostrar la ganancia rotulada como ganancia.

#### Scenario: Sin factura

- **WHEN** la campaña activa no tiene factura
- **THEN** el cuadrante dice `VENDÍ` con el total vendido, y tocarlo abre el campo para anotar la factura

#### Scenario: Con factura

- **WHEN** la campaña activa tiene factura anotada
- **THEN** el cuadrante dice `GANO` con la ganancia calculada

### Requirement: En cero las cifras se apagan

Una cifra que vale cero, o que no tiene dato detrás, SHALL pintarse en gris neutro sin color de estado y sin contador.

#### Scenario: Nada por cobrar

- **WHEN** no hay ningún saldo pendiente
- **THEN** el cuadrante de por cobrar se ve gris, sin rojo y sin el contador en cero

#### Scenario: Tarjeta sin configurar

- **WHEN** no hay día de corte de tarjeta guardado
- **THEN** los dos cuadrantes de tarjeta se ven apagados y tocarlos lleva a configurarla

### Requirement: El cierre del catálogo es una línea, salvo que apremie

El cierre de la campaña activa SHALL mostrarse como una línea compacta de encabezado. Cuando falten tres días o menos, o ya haya pasado, SHALL escalar a una tarjeta de ancho completo con el tono de alarma.

#### Scenario: Cierre lejano

- **WHEN** faltan 31 días para el cierre del catálogo
- **THEN** se muestra una sola línea con el nombre de la campaña y la fecha, sin número gigante

#### Scenario: Cierre inminente

- **WHEN** faltan 2 días para el cierre
- **THEN** se muestra la tarjeta de alarma de ancho completo con los días en grande

### Requirement: Dos relojes, dos verbos

El catálogo SHALL describirse con el verbo cerrar y la tarjeta con el verbo cortar, en toda la pantalla, para que nunca se lean como la misma fecha.

#### Scenario: Ambas fechas visibles a la vez

- **WHEN** la pantalla muestra el cierre del catálogo y el corte de la tarjeta
- **THEN** una dice cerrar y la otra dice cortar, y ninguna usa la palabra de la otra

### Requirement: Los pendientes van debajo de las cifras

La lista de seguimientos del día SHALL aparecer bajo la retícula de cifras, con su cantidad, y SHALL usar el estado vacío compacto cuando no haya ninguno.

#### Scenario: Hay pendientes

- **WHEN** hay cuatro seguimientos para hoy
- **THEN** aparecen bajo las cifras, encabezados por su cantidad

#### Scenario: No hay pendientes

- **WHEN** no hay ningún seguimiento
- **THEN** se muestra el estado vacío compacto y la fila de por entregar sigue visible sin desplazarse fuera de la pantalla

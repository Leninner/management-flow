## ADDED Requirements

### Requirement: Crear solo se pide cuando hay de qué distinguirse

Cuando la búsqueda de clientes no devuelva ninguna coincidencia, la pantalla de captura SHALL tomar el nombre escrito sin pedir confirmación y continuar al paso del producto. Cuando sí haya coincidencias, crear SHALL seguir siendo una acción explícita y las coincidencias SHALL mostrarse antes que ella.

#### Scenario: Nombre que no coincide con nadie

- **WHEN** la usuaria escribe un nombre que no coincide con ningún nombre, alias ni whatsapp guardado
- **THEN** ese nombre se ofrece como una fila común, igual que elegir a alguien, y confirmarlo con la fila o con Enter avanza al paso del producto sin mostrar ningún botón de crear

#### Scenario: Nombre que coincide con alguien

- **WHEN** la usuaria escribe un nombre que coincide con una o más personas guardadas
- **THEN** las coincidencias se listan arriba y crear queda como acción explícita debajo de ellas

#### Scenario: El cliente nuevo se guarda al anotar

- **WHEN** la usuaria avanzó con un nombre sin coincidencias y toca el botón de anotar
- **THEN** el cliente se crea en ese momento y el ítem queda anotado a su nombre

#### Scenario: Se descarta antes de anotar

- **WHEN** la usuaria avanzó con un nombre sin coincidencias y luego cambia de cliente sin anotar
- **THEN** no queda ningún cliente nuevo guardado

### Requirement: El producto escrito se toma tal cual cuando no hay historial que ofrecer

Cuando lo escrito en el paso de producto no coincida con ningún ítem del historial, la pantalla SHALL tomarlo tal cual sin pedir confirmación. Cuando haya coincidencias, SHALL listarlas antes de ofrecer el texto escrito.

#### Scenario: Producto que nunca se vendió

- **WHEN** la usuaria escribe un producto que no aparece en el historial
- **THEN** el producto queda elegido con lo escrito, sin un paso extra de confirmación

#### Scenario: Producto conocido

- **WHEN** lo escrito coincide con ítems vendidos antes
- **THEN** las coincidencias se listan con su último precio y elegir una copia ese precio al ítem

### Requirement: La captura suma al pedido de la campaña

Anotar un ítem para un cliente que ya tiene pedido en la campaña activa SHALL sumarlo a ese pedido. Nunca SHALL crearse un segundo pedido para el mismo cliente en la misma campaña.

#### Scenario: Segundo ítem del mismo cliente en el mismo live

- **WHEN** la usuaria anota un ítem a un cliente que ya tiene pedido en la campaña activa
- **THEN** el ítem entra en ese pedido y la cantidad de pedidos de la campaña no cambia

### Requirement: Lo que el cliente ya tiene se ve antes de anotar

Cuando el cliente elegido ya tenga pedido en la campaña activa, la pantalla SHALL mostrar cuántos ítems y qué total lleva, entre el producto elegido y el botón de anotar.

#### Scenario: Cliente con pedido abierto

- **WHEN** la usuaria elige un cliente que ya tiene tres ítems por $34.50 en la campaña activa
- **THEN** la pantalla lo muestra bajo el producto, antes del botón de anotar

#### Scenario: Cliente sin pedido en la campaña

- **WHEN** la usuaria elige un cliente sin pedido en la campaña activa
- **THEN** no se muestra ningún resumen y la pantalla no reserva espacio para él

### Requirement: El botón de anotar no se mueve

El botón principal de la pantalla de captura SHALL permanecer anclado al fondo, en la misma posición, sin importar cuánto contenido haya arriba.

#### Scenario: Primer ítem del live

- **WHEN** hay un solo producto elegido y ninguna captura previa
- **THEN** el botón sigue anclado al fondo, en el mismo lugar donde estará después de diez capturas

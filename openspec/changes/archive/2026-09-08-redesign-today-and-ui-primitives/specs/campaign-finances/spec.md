## ADDED Requirements

### Requirement: Factura de la campaña

`Campaign` SHALL admitir un monto opcional `supplierInvoiceAmount` con lo que Oriflame le facturó por esa campaña. Ausente significa que la factura todavía no llegó, nunca que valga cero.

#### Scenario: Campaña sin factura

- **WHEN** una campaña no tiene `supplierInvoiceAmount`
- **THEN** la ganancia de esa campaña es indefinida y no se calcula como el total vendido

#### Scenario: Respaldo anterior al cambio

- **WHEN** se importa un respaldo JSON exportado antes de este cambio
- **THEN** las campañas se cargan sin error y quedan sin factura

### Requirement: La ganancia excluye el envío

La ganancia de una campaña SHALL ser la suma de subtotales de sus pedidos confirmados menos la factura de esa campaña. El costo de envío SHALL quedar fuera de ambos lados: es plata que entra del cliente y sale al courier.

#### Scenario: Pedido con envío

- **WHEN** una campaña tiene un pedido confirmado con $100.00 en ítems y $5.00 de envío, y la factura fue $70.00
- **THEN** la ganancia es $30.00

#### Scenario: Pedido sin confirmar

- **WHEN** una campaña tiene un pedido sin confirmar
- **THEN** ese pedido no suma a la ganancia, porque todavía es un grito en un live

#### Scenario: Aritmética en centavos

- **WHEN** se suman ítems de $0.10 y $0.20 contra una factura de $0.30
- **THEN** la ganancia es exactamente $0.00

### Requirement: Lo recuperado de la tarjeta acumula todas las campañas

El monto que falta recuperar SHALL ser la suma, sobre toda campaña que tenga factura anotada, de la diferencia entre su factura y lo abonado en sus pedidos, con piso en cero por campaña.

#### Scenario: Una campaña a medio cobrar

- **WHEN** una campaña tiene factura de $180.00 y sus pedidos suman $60.00 abonados
- **THEN** falta recuperar $120.00

#### Scenario: Una campaña sobre-cobrada no tapa a otra

- **WHEN** una campaña con factura de $50.00 tiene $80.00 abonados y otra con factura de $100.00 tiene $0.00 abonados
- **THEN** falta recuperar $100.00, no $70.00

#### Scenario: Campaña sin factura

- **WHEN** una campaña no tiene factura anotada
- **THEN** no aporta nada al monto que falta recuperar

#### Scenario: Lo abonado incluye el envío

- **WHEN** se calcula lo recuperado
- **THEN** cuenta todo lo abonado por la clienta, envío incluido, porque esa plata también sirve para pagar la tarjeta

### Requirement: Corte de tarjeta como día fijo del mes

Los ajustes SHALL guardar el día de corte y el día de pago de la tarjeta como enteros del 1 al 31. El sistema SHALL proyectar el próximo corte real a partir de la fecha de hoy, recortando al último día del mes cuando el día configurado no existe en ese mes.

#### Scenario: El corte todavía no pasa este mes

- **WHEN** hoy es 8 de septiembre y el día de corte es 15
- **THEN** el próximo corte es el 15 de septiembre

#### Scenario: El corte ya pasó este mes

- **WHEN** hoy es 20 de septiembre y el día de corte es 15
- **THEN** el próximo corte es el 15 de octubre

#### Scenario: Hoy es el día del corte

- **WHEN** hoy es 15 de septiembre y el día de corte es 15
- **THEN** el próximo corte es hoy, 15 de septiembre

#### Scenario: Día que no existe en el mes

- **WHEN** el día de corte es 31 y el próximo mes tiene 30 días
- **THEN** el corte cae el día 30

#### Scenario: Tarjeta sin configurar

- **WHEN** no hay día de corte guardado
- **THEN** no se calcula ningún corte y la pantalla omite ese dato

### Requirement: Ningún total de plata se guarda

Todos los montos de esta capacidad SHALL calcularse a partir de los ítems y los abonos en el momento de leerlos, en centavos enteros, y ninguno SHALL persistirse.

#### Scenario: Se edita un ítem

- **WHEN** cambia la cantidad de un ítem de un pedido
- **THEN** la ganancia y el monto por recuperar reflejan el cambio sin ninguna escritura extra

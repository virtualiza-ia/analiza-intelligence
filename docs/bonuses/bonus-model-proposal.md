# Bonus Model Proposal

Fecha: 2026-08-13

Alcance: sistema de recomendacion de bonos mensuales para Gerentes de Sucursal y Gerentes de Area en Fisioterapia, Laboratorio e Imagenes.

Este modelo no paga nomina, no ejecuta transferencias y no integra bancos. El sistema recomienda; una autoridad autorizada revisa, aprueba, rechaza o ajusta con razon documentada.

## Principios

- No pagar por ingresos absolutos solamente.
- No usar formula opaca.
- Normalizar por linea, tamano, capacidad, productividad, margen y calidad disponible.
- No usar datos incompletos para bonos finales.
- Mostrar siempre desglose por componente.
- Mantener bono sugerido y bono aprobado separados.
- Registrar razon cuando se ajuste o rechace.

## Rango

- Bono minimo recomendado: USD 100.
- Bono maximo recomendado: USD 200.
- Si el resultado no cumple elegibilidad, el monto mostrado debe ser USD 0 o `Pendiente de revision`, no un bono automatico.

## Estados

`ELIGIBLE`

El cierre esta publicado, el periodo esta completo, los KPIs criticos existen, la calidad de datos es suficiente y no hay inconsistencias abiertas.

`REVIEW REQUIRED`

Hay resultado calculable, pero existe una advertencia: calidad limitada, outlier relevante, evidencia pendiente, margen inestable, SLA critico o cierre con observaciones.

`NOT ELIGIBLE`

No existe cierre publicado, faltan KPIs criticos, el periodo esta incompleto, la calidad de datos es insuficiente o hay inconsistencias no resueltas.

## Workflow

SYSTEM RECOMMENDS

El sistema calcula score, componente y bono recomendado.

OPERATIONS REVIEWS

Gerente de Operaciones o autoridad autorizada revisa evidencia, periodo, cierre y calidad.

APPROVED

El bono recomendado se acepta.

REJECTED

No se aprueba bono; requiere motivo.

ADJUSTED WITH REASON

Se ajusta monto o estado; requiere razon, usuario, fecha y evidencia.

## Gerente de Sucursal

Indice base sobre 100 puntos:

| Componente | Peso base | Que mide |
| --- | ---: | --- |
| Finanzas | 30% | margen, resultado financiero y salud economica sin premiar volumen puro |
| Operacion | 25% | uso de capacidad, productividad y continuidad operativa |
| Metas | 20% | cumplimiento contra metas aprobadas del periodo |
| Eficiencia/calidad | 15% | SLA, no-show, cancelaciones, TAT, informes, calidad operativa segun linea |
| Calidad y puntualidad del dato | 10% | cierre publicado, puntualidad, completitud y consistencia |

### Fisioterapia

Pesos recomendados:

| Componente | Peso |
| --- | ---: |
| Finanzas | 25% |
| Operacion | 30% |
| Metas | 20% |
| Eficiencia/calidad | 15% |
| Calidad y puntualidad del dato | 10% |

Razon: Fisioterapia depende mucho de convertir agenda en sesiones efectivas. El modelo debe premiar ocupacion real, continuidad y control de no-show, no solo facturacion.

Indicadores disponibles/propuestos:

- Cumplimiento facturacion.
- Margen.
- Ocupacion efectiva.
- Sesiones.
- No-show cuando exista.
- Cancelacion cuando exista.
- Productividad por terapeuta cuando exista.

### Laboratorio

Pesos recomendados:

| Componente | Peso |
| --- | ---: |
| Finanzas | 30% |
| Operacion | 25% |
| Metas | 20% |
| Eficiencia/calidad | 15% |
| Calidad y puntualidad del dato | 10% |

Razon: Laboratorio debe balancear facturacion, margen, pruebas, productividad, calidad y TAT. Venta alta con margen bajo no debe maximizar bono.

Indicadores disponibles/propuestos:

- Cumplimiento facturacion.
- Margen.
- Volumen/pruebas.
- Productividad por orden, tecnico o capacidad.
- Throughput cuando exista.
- Calidad.
- TAT cuando exista.

### Imagenes

Pesos recomendados:

| Componente | Peso |
| --- | ---: |
| Finanzas | 28% |
| Operacion | 27% |
| Metas | 20% |
| Eficiencia/calidad | 15% |
| Calidad y puntualidad del dato | 10% |

Razon: Imagenes necesita balancear facturacion, estudios, utilizacion de equipos, informes pendientes y TAT. Una sede saturada con informes atrasados no debe recibir bono maximo automatico.

Indicadores disponibles/propuestos:

- Cumplimiento facturacion.
- Margen.
- Estudios.
- Productividad por equipo o modalidad.
- Capacidad/utilizacion.
- Informes pendientes cuando exista.
- TAT cuando exista.

## Gerente de Area

El Gerente de Area no debe evaluarse por suma simple de ventas. Su bono debe reflejar calidad de gestion del portafolio.

Indice de area sobre 100 puntos:

| Componente | Peso | Que mide |
| --- | ---: | --- |
| Sucursales en meta | 25% | porcentaje de sucursales que cumplen metas aprobadas |
| Resultado consolidado | 20% | resultado agregado normalizado por cantidad de sucursales |
| Mejora de rezagadas | 20% | avance de sedes con score bajo o brecha negativa |
| Eficiencia y margen | 15% | margen, productividad y capacidad sin depender de volumen |
| Puntualidad/calidad de cierres | 20% | cierres publicados, datos completos e inconsistencias resueltas |

## Thresholds

Recomendacion inicial:

| Banda | Score | Bono recomendado |
| --- | ---: | ---: |
| Satisfactory | 70 - 74 | USD 100 |
| Strong | 75 - 81 | USD 125 |
| High | 82 - 88 | USD 150 |
| Outstanding | 89 - 94 | USD 175 |
| Exceptional | 95 - 100 | USD 200 |

Reglas:

- Score menor a 70 no genera bono automatico.
- `REVIEW REQUIRED` puede mostrar monto recomendado, pero no aprobado.
- `NOT ELIGIBLE` muestra USD 0 hasta resolver condicion.
- La banda Exceptional debe ser rara y estar sustentada por datos completos.

## Elegibilidad

No asignar bono si:

- cierre mensual no publicado;
- calidad de datos insuficiente;
- faltan KPIs criticos;
- periodo incompleto;
- hay inconsistencias no resueltas;
- hay outliers criticos sin explicacion;
- se intenta mezclar datos DEMO con datos reales.

## Transparencia Para El Gerente

Cada gerente debe ver:

- Bono propuesto.
- Estado.
- Score total.
- Periodo.
- Componentes:
  - Finanzas.
  - Operacion.
  - Metas.
  - Eficiencia/calidad.
  - Calidad dato.
- Texto: "Por que recibo este bono".
- Bloqueos o advertencias.
- Evidencia usada.

## Backtest Con Datos DEMO

Objetivo del backtest:

- Verificar que no premie sucursales grandes injustamente.
- Verificar que no penalice sucursales pequenas por volumen.
- Evitar demasiados USD 200.
- Evitar que todo caiga en USD 100.
- Revisar si el resultado tiene sentido operativo.

Criterios esperados:

- Las sucursales con mayor volumen pero margen bajo o calidad insuficiente no deben quedar en la banda maxima.
- Las sucursales pequenas con buena meta, margen, ocupacion y calidad pueden superar a sucursales grandes.
- Las alertas de calidad deben llevar a `REVIEW REQUIRED` o `NOT ELIGIBLE`.
- Gerentes de Area deben reflejar distribucion de sedes, no solo total agregado.

## Auditoria

Cada recomendacion debe registrar:

- periodo;
- linea;
- gerente;
- rol evaluado;
- sucursales incluidas;
- componentes y pesos;
- score;
- estado;
- bono recomendado;
- reglas de elegibilidad aplicadas;
- aprobador, fecha y razon cuando exista decision humana.

## Seguridad

- Gerente de Sucursal: ve su resultado, no lo aprueba.
- Gerente de Area: ve resultados de su alcance segun politica.
- Gerente de Operaciones: puede revisar, aprobar o ajustar segun permisos.
- CEO: lectura consolidada.

La autorizacion final debe seguir siendo server-side. La UI es solo una capa adicional de experiencia.

## Decision Pendiente De Negocio

Antes de usar este modelo en nomina real, Direccion debe aprobar:

1. pesos por linea;
2. thresholds finales;
3. KPIs criticos por linea;
4. tolerancia de calidad de datos;
5. politica de ajustes;
6. autoridad aprobadora;
7. si el bono de area puede aprobarse cuando una sucursal del area esta `NOT ELIGIBLE`.

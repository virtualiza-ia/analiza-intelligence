# KPI Contracts

Fecha de revision: 2026-08-07

Este documento define el contrato minimo para presentar KPIs en ANALIZA INTELLIGENCE. Hasta que un KPI cumpla este contrato, debe mostrarse como DEMO, no disponible o pendiente de validacion.

## Principios obligatorios

- No inventar KPIs, formulas, metas, periodos, datos financieros, datos clinicos ni conclusiones ejecutivas.
- No mezclar datos DEMO con datos reales en la misma organizacion, vista, export o insight.
- Todo KPI debe declarar fuente, periodo, granularidad, filtros soportados, required fields y formula.
- Todo KPI debe tener lineage hasta archivo, conector, import, transformacion o tabla fuente.
- Si falta un campo esencial, el KPI no se muestra como numero valido.
- Si un filtro global no es soportado por el KPI, la UI debe mostrar estado no disponible o alcance limitado.
- Finanzas debe reconciliar antes de mostrarse como dato ejecutivo.

## Dimensiones obligatorias

Cada registro analitico debe poder trazarse, cuando aplique, a:

- `organization_id`
- `country_id`
- `company_id`
- `operational_area_id`
- `branch_id`
- `manager_id`
- `business_line`
- `period_start`
- `period_end`
- `source_type`
- `source_id`
- `import_id`
- `is_demo`

## Contrato de filtros globales

Todo dashboard debe declarar:

- Filtros soportados: pais, empresa, area, sucursal, gerente, linea, periodo.
- Filtros obligatorios para calcular.
- Comportamiento ante scope no permitido.
- Comportamiento ante dato insuficiente.
- Si el KPI usa snapshots, transacciones o agregados.

Regla: el mismo contexto debe producir el mismo alcance de datos en overview, finanzas, operaciones, importaciones e insights.

## Contratos KPI iniciales

| KPI | Formula | Granularidad minima | Required fields | Filtros requeridos | Bloquear si |
| --- | --- | --- | --- | --- | --- |
| Venta neta | Suma de ventas netas validadas | Transaccion o dia-sucursal | `net_amount`, `currency`, `period`, `branch_id`, `company_id`, `country_id`, `source_id` | Pais, empresa, periodo | Moneda ausente, fuente no validada, periodo ausente |
| Venta por canal | Suma de venta neta agrupada por canal | Transaccion o dia-sucursal-canal | Campos de venta neta + `channel` | Pais, empresa, periodo, sucursal opcional | Canal ausente o total no reconcilia con venta neta |
| Forma de pago | Suma de pagos agrupada por metodo | Pago o dia-sucursal-metodo | `payment_amount`, `payment_method`, `currency`, `period`, `branch_id`, `source_id` | Pais, empresa, periodo | Suma de pagos no reconcilia con ventas cobradas |
| Crecimiento anual | `(periodo_actual - periodo_comparable) / periodo_comparable` | Mes-linea o mes-sucursal | Venta neta actual, venta neta comparable, periodos comparables | Pais, empresa, periodo | Falta periodo comparable o base es cero/no confiable |
| Margen contribucion | `venta_neta - costos_directos` | Mes-sucursal-linea | `net_amount`, `direct_cost_amount`, `currency`, `period`, `source_id` | Pais, empresa, periodo | Costos directos no validados |
| Utilidad operativa | `venta_neta - costos_directos - gastos_operativos` | Mes-sucursal-linea | Campos de margen + `operating_expense_amount` | Pais, empresa, periodo | Gastos operativos incompletos |
| Ocupacion agendada | `citas_agendadas / capacidad_planificada` | Dia-sucursal | `scheduled_appointments`, `planned_capacity`, `period`, `branch_id` | Pais, empresa, sucursal o area, periodo | Capacidad planificada ausente o cero |
| Ocupacion efectiva | `servicios_realizados / capacidad_planificada` | Dia-sucursal | `completed_services`, `planned_capacity`, `period`, `branch_id` | Pais, empresa, sucursal o area, periodo | Servicios o capacidad no validados |
| Brecha asistencia | `citas_agendadas - servicios_realizados` | Dia-sucursal | `scheduled_appointments`, `completed_services`, `period`, `branch_id` | Pais, empresa, periodo | Citas y servicios no tienen mismo periodo/sucursal |
| Utilizacion tecnica laboratorio | `pruebas_procesadas / capacidad_tecnica` | Dia-sucursal | `processed_tests`, `technical_capacity`, `period`, `branch_id` | Pais, empresa, sucursal o area, periodo | Capacidad tecnica ausente o cero |
| Data quality score | Ponderacion de completitud, validez, duplicados y reconciliacion | Import o batch | Conteos de reglas ejecutadas y fallidas | Import, fuente, periodo | No hay resultado de validacion |
| Cumplimiento de meta | `resultado_actual / meta_aprobada` | Mes-sucursal-linea | KPI base, `target_value`, `target_period`, `approval_status` | Pais, empresa, periodo | Meta no aprobada o no corresponde al periodo |

## Reglas financieras

- La venta total de un periodo debe reconciliar con la suma por canal para el mismo alcance.
- La venta cobrada debe reconciliar con formas de pago para el mismo alcance.
- No mezclar venta bruta, descuentos, impuestos, venta neta y cobros sin etiquetas explicitas.
- Toda moneda debe declararse y convertirse solo con fuente/tasa/fecha aprobada.
- No calcular utilidad, margen o EBITDA sin costos y gastos completos.
- Las narrativas ejecutivas deben citar formula y periodo base.

## Reglas de importacion para KPIs

- Todo archivo debe pasar por validacion server-side antes de publicar datos.
- Todo import debe registrar usuario, fecha, fuente, nombre sanitizado, hash, version de plantilla y resultado de reglas.
- Las formulas peligrosas de spreadsheet deben bloquearse o neutralizarse.
- Los registros publicados deben conservar `import_id` y `source_id`.
- Reemplazos y rollbacks deben preservar auditoria.

## Gaps actuales del codigo

- Los dashboards financieros usan valores hardcoded que no reconcilian.
- Los filtros de fecha y sucursal no recalculan todos los KPIs.
- No existe servicio central de contratos KPI.
- No existe compuerta central de data quality antes de insights ejecutivos.
- Los datos DEMO estan mezclados con estructuras de producto en `lib/analytics` y `lib/tenant`.

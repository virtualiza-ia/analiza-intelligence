# Integracion oficial de KPIs publicados

## Decision

Las pantallas ejecutivas y operativas fuera de `APP_ENV=demo` leen KPIs desde cierres mensuales publicados en PostgreSQL con RLS. La fuente canonica es:

- `monthly_closings`
- `closing_versions`
- `closing_kpi_results`
- `kpi_targets`
- `generated_insights`

El sistema solo considera versiones `PUBLISHED`, no-demo y vigentes como publicadas por `monthly_closings.published_version_id`.

## Propagacion

Cada formulario vertical persiste sus resultados calculados en `closing_kpi_results` al validar y al publicar. La lectura oficial conserva todos los registros del cierre publicado:

- `CALCULABLE`: se muestra el valor y puede agregarse a metas o totales.
- `NOT_CALCULABLE`: se muestra como pendiente con `required_fields` y `missing_fields`; no se suma como cero.

Las rutas de Finanzas, Metas, Insights, Citas, Capacidad, Sucursales, Profesionales, Servicios, Operacion, Gerentes, Calidad de datos, Laboratorio, Fisioterapia e Imagenes usan el mismo snapshot oficial cuando no estan en modo demo.

## Periodos y filtros

El snapshot respeta filtros de pais, empresa, sucursal y linea de negocio. Para periodos:

- Si `from` apunta a un periodo con cierre publicado, ese periodo se selecciona.
- Si solo `to` apunta a un periodo publicado, se selecciona ese periodo.
- Si no hay periodo solicitado, se usa el ultimo periodo publicado dentro del contexto autorizado.

## Regla de integridad

No se mezclan datos demo con datos oficiales. Los KPIs pendientes se mantienen visibles como deuda de calidad de datos y no alimentan conclusiones ni agregados ejecutivos.

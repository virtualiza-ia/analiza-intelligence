# Centro de control: conectores, calidad y metas

## Conectores CRM

La pantalla de Conectores permite preparar la integracion por linea de negocio: Laboratorio, Fisioterapia e Imagenes. En el entorno actual solo genera llaves `DEMO` para validar el flujo de trabajo y explicar que endpoints debe configurar cada CRM.

El selector superior de linea de negocio gobierna la pantalla. Si se elige Laboratorio, solo se muestran endpoints, requisitos y llaves DEMO de Laboratorio; en Consolidado se muestran todas las lineas para revision corporativa.

Las llaves reales no deben generarse ni mostrarse en el navegador. En produccion se deben crear server-side, guardarse cifradas, mostrar solo los ultimos cuatro caracteres y registrar auditoria sin exponer secretos.

Conectores e Integraciones son pantallas de administracion tecnica. Gerente de operaciones no las ve ni puede ejecutar sincronizaciones directas; mientras no exista conector aprobado, operaciones trabaja desde Importaciones.

Cada plan de conector define:

- endpoints por linea de negocio;
- campos minimos obligatorios;
- modulos que alimenta;
- requisitos tecnicos;
- pasos de conexion;
- documentos masivos alternativos cuando no exista API viable.

## Calidad de datos por AnaliA

AnaliA revisa plantillas, fuentes, reglas de cierre y dashboards para decidir si el dato puede alimentar KPIs, metas e insights. El score no sube por hacer clic en una accion; solo cambia cuando el dato corregido vuelve a pasar reglas.

Las recomendaciones se filtran por la linea activa del encabezado. Cuando una mejora afecta el modelo consolidado, puede aparecer junto a la linea seleccionada porque protege trazabilidad, aprobacion o lectura ejecutiva comun.

En produccion, `Crear tarea` debe crear una tarea auditada antes de modificar plantillas, fuentes, modelos o dashboards. Ninguna recomendacion puede convertir datos incompletos en conclusiones finales.

La pantalla debe mostrar:

- reglas evaluadas: completitud, validez, consistencia, unicidad, oportunidad y trazabilidad;
- decision de calidad del cierre activo;
- evidencia requerida para cerrar calidad;
- tareas creadas para corregir fuentes o modelos;
- bloqueo de insights cuando falten costos, capacidad, responsables o fuente trazable.

## Metas, avances, bonos y ROI

La pantalla de Metas y avances presenta sugerencias por linea de negocio y sucursal para los roles que aun trabajan metas como modulo separado. Gerente de operaciones usa `/protected/operacion` como informe unico de metas, avances e insights para evitar KPIs duplicados. Cada sugerencia conserva:

- ingreso actual;
- meta sugerida;
- crecimiento conservador;
- responsable;
- confianza;
- regla de bono;
- estrategia comercial u operativa;
- rango de ROI simulado;
- supuestos visibles;
- condicion de cautela antes de aprobar.

El ROI es un rango `DEMO` simulado. Antes de aprobar una meta real, el CEO debe validar costos, capacidad, calidad de datos y disponibilidad operativa. Las metas sugeridas no reemplazan la meta final definida por direccion.

La linea seleccionada arriba limita las metas visibles, el total de bonos y el ROI medio. Esto evita comparar metas de Fisioterapia dentro de una vista filtrada a Laboratorio.

# Centro de control: conectores, calidad y metas

## Conectores CRM

La pantalla de Conectores permite preparar la integracion por linea de negocio: Laboratorio, Fisioterapia e Imagenes. En el entorno actual solo genera llaves `DEMO` para validar el flujo de trabajo y explicar que endpoints debe configurar cada CRM.

El selector superior de linea de negocio gobierna la pantalla. Si se elige Laboratorio, solo se muestran endpoints, requisitos y llaves DEMO de Laboratorio; en Consolidado se muestran todas las lineas para revision corporativa.

Las llaves reales no deben generarse ni mostrarse en el navegador. En produccion se deben crear server-side, guardarse cifradas, mostrar solo los ultimos cuatro caracteres y registrar auditoria sin exponer secretos.

Cada plan de conector define:

- endpoints por linea de negocio;
- campos minimos obligatorios;
- modulos que alimenta;
- requisitos tecnicos;
- pasos de conexion;
- documentos masivos alternativos cuando no exista API viable.

## Calidad de datos por AnaliA

AnaliA revisa plantillas, conectores y dashboards para sugerir mejoras por modulo. El boton `Aplicar` funciona como una accion `DEMO`: marca la recomendacion como aplicada y sube el score visual de confiabilidad.

Las recomendaciones se filtran por la linea activa del encabezado. Cuando una mejora afecta el modelo consolidado, puede aparecer junto a la linea seleccionada porque protege trazabilidad, aprobacion o lectura ejecutiva comun.

En produccion, `Aplicar` debe crear una tarea auditada antes de modificar plantillas, modelos o dashboards. Ninguna recomendacion puede convertir datos incompletos en conclusiones finales.

Las sugerencias se enfocan en:

- columnas obligatorias para plantillas de resultados;
- normalizacion de estados;
- trazabilidad de fuentes, supuestos y aprobador;
- mejor lectura visual de operacion y salud financiera;
- bloqueo de insights cuando falten costos, capacidad o responsables.

## Metas, avances, bonos y ROI

La pantalla de Metas y avances presenta sugerencias por linea de negocio y sucursal. Cada sugerencia conserva:

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

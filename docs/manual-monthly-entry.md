# Formulario mensual manual

## Decision

La via manual principal para actualizar Analiza Intelligence sera un formulario mensual por linea de negocio, sucursal y periodo. Este formulario vive en `/protected/plantillas`, con etiqueta de menu `Formulario mensual`, reemplazando la antigua biblioteca de descargas Excel. El flujo de Excel queda como respaldo para migraciones, reemplazos especiales o fuentes que todavia no esten cubiertas por el formulario.

## Alcance

- Cada gerente registra un cierre mensual por linea de negocio.
- La sucursal reportada se elige desde el catalogo activo de sucursales; no se captura como texto libre.
- El gerente de sucursal y el gerente de area se eligen desde listas derivadas del catalogo; no se capturan como texto libre.
- El catalogo de sucursales incluye gerente de sucursal, gerente de area, pais, zona y linea de negocio desde `ddddd2.xlsx`.
- El cierre captura contexto, resultados comerciales, operacion, citas, capacidad, costos, margen y calidad.
- En Laboratorio, el formulario ya no usa los campos genericos de capacidad/equipo. Sigue la plantilla de resultados y pide las secciones amarillas: financiero, datos generales, base de clientes, gastos, personal e inventario.
- La seccion financiera de Laboratorio solo pide Meta, Venta Total y Costo de la Venta; margen, alcance y utilidad se calculan desde esos datos cuando aplique.
- El primer paso de Laboratorio precarga mes, sucursal, gerente de sucursal, gerente de area, departamento, fecha de corte y fecha limite de carga desde el contexto y catalogo activo.
- Los renglones no amarillos de la plantilla, como totales, promedios o validaciones, deben calcularse desde los valores ingresados y no capturarse como texto libre.
- Laboratorio captura personal de la sucursal, como flebotomistas, atencion al cliente, enfermeras, area tecnica y limpieza/vigilantes, para que productividad y bonos no dependan de texto fijo del dashboard.
- El cierre de Laboratorio incluye cantidad y monto de consumibles, insumos y reactivos. AnaliA compara esos montos contra ingreso, ordenes, costos e historico antes de tratarlos como confiables.
- La calidad ya no se captura como un score manual. AnaliA calcula el score con completitud, coherencia, archivos cargados, montos sospechosos, sucursal, periodo, duplicados y trazabilidad.
- El Excel comercial de examenes medicos y montos vendidos se carga como una sola fuente de apoyo con columnas Fecha, Sucursal, Doctor, Examen, Especialidad, Area, Total y Visitador.
- La evaluacion 360 se realizara por correo o formulario anonimo; sus resultados llenan automaticamente score, tema cualitativo y accion sugerida.
- La pantalla muestra un bloque Year to date para revisar acumulado 2026 por linea y sucursal seleccionada.
- Cada registro conserva historial por linea, sucursal, periodo, fuente, estado y marca `DEMO`.
- La vista consolidada solo muestra historial; no permite publicar cierres porque no se deben mezclar negocios distintos.
- AnaliA puede usar estos cierres para Insights, alertas tempranas, metas sugeridas y lectura de salud financiera.

## Experiencia visual

El formulario debe leerse como un asistente de cierre mensual, no como un tablero ejecutivo. La pantalla prioriza:

- Encabezado claro de captura mensual.
- Pasos visibles con pendientes por seccion.
- Campos grandes, con selectores cuando el dato viene de catalogo.
- Resumen lateral antes de publicar.
- Alertas automaticas de AnaliA con motivo visible cuando un monto no cuadra.
- Dashboard Year to date para comparar el acumulado contra meta sin abrir otra pantalla.
- Reglas y metricas como apoyo, no como contenido principal.

## Roles y jerarquia

- `super_admin`: gobierna permisos globales, conectores, auditoria y seguridad del sistema.
- `webmaster_admin`: alias historico de administrador DEMO, conservado por compatibilidad.
- `ceo`: consulta resultados ejecutivos y decide metas finales.
- `gerente_operaciones`: crea sucursales, crea areas operativas, asigna sucursales a areas y valida cierres dentro de su alcance.
- `gerente_area`: crea o sustituye gerentes de sucursal solo dentro de sus areas, supervisa el grupo de sucursales asignadas y compara disciplina, puntualidad y calidad.
- `gerente_sucursal`: llena el cierre mensual de su sucursal y consulta sus resultados.
- `usuario_operativo`: ayuda con carga o correccion de datos de su sucursal cuando tenga permiso.
- `viewer`: solo consulta la informacion autorizada.

El acceso siempre debe evaluar organizacion, pais, empresa, area operativa, sucursal y rol. Un rol valido sin alcance valido no debe permitir ver ni editar datos.

Cuando el usuario tiene rol `gerente_sucursal`, la sucursal reportada, gerente de sucursal y gerente de area deben venir de la cuenta loggeada y su alcance asignado. En DEMO se simula con el rol y el selector superior; en produccion debe resolverse desde las asignaciones de usuario y bloquear cualquier cambio fuera de su `branch_id`.

## Historial

El historial DEMO heredado puede seguir leyendose desde `localStorage` bajo `analiza:manual-monthly-history`, pero los guardados y publicaciones productivos usan `/api/manual-submissions` con sesion autenticada y nunca vuelven a almacenamiento del navegador como fallback. El historial productivo persiste en base de datos con:

Al seleccionar sucursal, linea y periodo, el formulario consulta el historial autorizado del servidor y recupera automaticamente el borrador activo si existe. La consulta acepta filtros exactos y devuelve un maximo de 50 versiones activas dentro del alcance del usuario.

- Organizacion, pais, empresa, linea de negocio, sucursal y periodo.
- Usuario responsable, gerente de sucursal, gerente de area, rol, fecha de captura, fecha de publicacion y estado.
- Version activa, version anterior, motivo de reemplazo y auditoria.
- Fuente de datos: formulario, conector, carga Excel o correccion aprobada.
- Score de calidad y lista de reglas bloqueantes o advertencias.
- Archivos comerciales asociados: reporte de examenes medicos y montos vendidos, evaluaciones 360 anonimas y cualquier conector equivalente.
- Deadline del dia 5 del mes siguiente, estado de puntualidad y efecto en score/bono.

## Calidad y privacidad

- No se deben capturar nombres, telefonos, documentos ni datos clinicos identificables de pacientes.
- No se publica un cierre si faltan campos obligatorios.
- Un cierre publicado solo puede reemplazarse con autorizacion de administrador.
- La carga tardia queda marcada como penalizacion DEMO para score, disciplina y bono sugerido.
- La evaluacion 360 debe guardarse como senal anonima y cualitativa; no debe exponer colaboradores ni usarse para represalias.
- Si el score de calidad automatico baja de 70%, el cierre debe quedar bloqueado o marcado con advertencia.
- Si un monto parece sospechoso, AnaliA debe mostrar la razon concreta, por ejemplo reactivos demasiado altos frente a venta total, clientes Analiza/DRSV que superan clientes totales, ordenes por canal que no cuadran con ordenes totales, archivo comercial faltante o periodo inconsistente.
- Los dashboards ejecutivos no deben presentar conclusiones fuertes cuando la calidad sea insuficiente.

## Conectores

Cuando existan APIs oficiales, el conector debe alimentar los mismos campos del formulario. Si el conector no cumple reglas de calidad, se mantiene el formulario como fallback hasta corregir la integracion.

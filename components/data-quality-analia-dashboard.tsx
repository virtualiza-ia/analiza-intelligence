"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Lightbulb,
  ShieldCheck,
  UploadCloud,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  analiaQualitySuggestions,
  type AnaliaQualitySuggestion,
} from "@/lib/analytics/business-control-center";
import { useActiveBusinessLine } from "@/hooks/use-active-business-line";
import { cn } from "@/lib/utils";

function priorityClass(priority: AnaliaQualitySuggestion["priority"]) {
  if (priority === "Alta") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (priority === "Media") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-muted">
      <div
        className="h-2 rounded-full bg-primary"
        style={{ width: `${Math.max(6, Math.min(value, 100))}%` }}
      />
    </div>
  );
}

const commercialUploadRequirements = [
  {
    id: "doctor-sales",
    title: "Excel doctores y montos vendidos",
    description:
      "Doctor, especialidad, examen, monto vendido, sucursal, periodo y visitador asociado.",
    owner: "Gerencia de operaciones Laboratorio",
  },
  {
    id: "medical-reps",
    title: "Excel visitadores medicos",
    description:
      "Visitador, doctores asignados, ventas del mes, zona, seguimiento y cartera activa.",
    owner: "Gerencia comercial / Laboratorio",
  },
  {
    id: "evaluation-email",
    title: "Evaluaciones 360 por correo",
    description:
      "El equipo responde por correo/formulario anonimo y los resultados llenan automaticamente score, tema y accion.",
    owner: "Recursos humanos / Operaciones",
  },
];

const automaticQualityAlerts = [
  {
    title: "Monto sospechoso",
    reason:
      "AnaliA compara reactivos, insumos y consumibles contra venta neta, pruebas, historico y meta antes de aceptar el cierre.",
  },
  {
    title: "Sucursal o periodo no cuadran",
    reason:
      "Si el archivo dice un mes y la hoja interna trae otro, queda en alerta hasta que alguien lo corrija o lo autorice.",
  },
  {
    title: "Archivo comercial faltante",
    reason:
      "Sin doctores o visitadores no se calcula rendimiento medico ni ventas mes a mes por cartera.",
  },
  {
    title: "Duplicado o salto fuera de rango",
    reason:
      "El agente revisa duplicados, cambios bruscos contra el mes anterior y valores imposibles antes de alimentar dashboards.",
  },
];

export function DataQualityAnaliaDashboard() {
  const activeBusinessLine = useActiveBusinessLine();
  const [appliedIds, setAppliedIds] = useState<Set<string>>(() => new Set());
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const visibleSuggestions = useMemo(
    () =>
      activeBusinessLine.isConsolidated
        ? analiaQualitySuggestions
        : analiaQualitySuggestions.filter(
            (suggestion) =>
              suggestion.line === activeBusinessLine.line ||
              suggestion.line === "Consolidado",
          ),
    [activeBusinessLine.isConsolidated, activeBusinessLine.line],
  );
  const pendingSuggestions = visibleSuggestions.filter(
    (suggestion) => !appliedIds.has(suggestion.id),
  );
  const appliedCount = visibleSuggestions.filter((suggestion) =>
    appliedIds.has(suggestion.id),
  ).length;
  const qualityScore = useMemo(
    () => Math.min(94, 72 + appliedCount * 5),
    [appliedCount],
  );

  function applySuggestion(id: string) {
    setAppliedIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }

  function registerUploadedFile(id: string, fileName: string) {
    setUploadedFiles((current) => ({
      ...current,
      [id]: fileName,
    }));
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              Entorno DEMO
            </Badge>
            <Badge variant="outline">Recomendaciones aplicables por AnaliA</Badge>
            <Badge variant="outline">Filtro: {activeBusinessLine.line}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-card">
              <Bot className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Calidad de datos por AnaliA
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                AnaliA revisa plantillas, conectores y dashboards para sugerir
                cambios que mejoren la lectura de la operacion y salud
                financiera sin inventar datos.
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-md border bg-card p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <ShieldCheck className="size-4 text-primary" />
            Score de confiabilidad DEMO
          </div>
          <div className="text-3xl font-semibold">{qualityScore}%</div>
          <ProgressBar value={qualityScore} />
          <p className="mt-2 leading-6 text-muted-foreground">
            Sube solo cuando aplicas reglas de validacion o mejoras de lectura.
            No convierte datos DEMO en datos reales.
          </p>
        </aside>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          {
            icon: FileSpreadsheet,
            label: "Plantillas",
            value: `${visibleSuggestions.filter((item) => item.target === "Plantilla de resultados").length} mejoras`,
          },
          {
            icon: BarChart3,
            label: "Dashboards",
            value: `${visibleSuggestions.filter((item) => item.target === "Dashboard").length} lecturas`,
          },
          { icon: ClipboardCheck, label: "Aplicadas", value: `${appliedCount}` },
          { icon: Lightbulb, label: "Pendientes", value: `${pendingSuggestions.length}` },
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <article className="rounded-md border bg-card p-4" key={metric.label}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="size-4 text-primary" />
                {metric.label}
              </div>
              <div className="mt-2 text-2xl font-semibold">{metric.value}</div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border bg-card p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <UploadCloud className="size-4 text-primary" />
                Cargas que reemplazan el formulario de calidad
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                La calidad no se captura a mano. Se alimenta con archivos,
                evaluaciones por correo y validaciones automaticas de AnaliA.
              </p>
            </div>
            <Badge variant="outline">Laboratorio primero</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {commercialUploadRequirements.map((requirement) => (
              <label
                className="grid gap-3 rounded-md border bg-background p-3 text-sm"
                key={requirement.id}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <FileSpreadsheet className="size-4 text-primary" />
                  {requirement.title}
                </span>
                <span className="min-h-14 text-xs leading-5 text-muted-foreground">
                  {requirement.description}
                </span>
                <input
                  accept=".xlsx,.xls,.csv"
                  className="block w-full cursor-pointer rounded-md border bg-card text-xs file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-medium file:text-primary-foreground"
                  onChange={(event) =>
                    registerUploadedFile(
                      requirement.id,
                      event.target.files?.[0]?.name ?? "",
                    )
                  }
                  type="file"
                />
                <span className="text-xs text-muted-foreground">
                  {uploadedFiles[requirement.id]
                    ? `Listo: ${uploadedFiles[requirement.id]}`
                    : `Responsable: ${requirement.owner}`}
                </span>
              </label>
            ))}
          </div>
        </div>

        <aside className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="mb-3 flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4" />
            Regla de calidad automatica
          </div>
          <p className="leading-6">
            Si AnaliA detecta un monto sospechoso, no debe esconderlo ni
            aprobarlo sola: muestra la razon, bloquea conclusiones fuertes y
            pide validacion humana con trazabilidad.
          </p>
        </aside>
      </section>

      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-4 text-primary" />
          Alertas automaticas que AnaliA revisa
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {automaticQualityAlerts.map((alert) => (
            <article className="rounded-md border bg-background p-3" key={alert.title}>
              <div className="text-sm font-semibold">{alert.title}</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {alert.reason}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-3">
          {visibleSuggestions.map((suggestion) => {
            const applied = appliedIds.has(suggestion.id);

            return (
              <article
                className={cn(
                  "rounded-md border bg-card p-4",
                  applied && "border-emerald-200 bg-emerald-50",
                )}
                key={suggestion.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={priorityClass(suggestion.priority)}>
                        {suggestion.priority}
                      </Badge>
                      <Badge variant="outline">{suggestion.line}</Badge>
                      <Badge variant="outline">{suggestion.target}</Badge>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold">
                      {suggestion.module}: {suggestion.issue}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {suggestion.suggestedChange}
                    </p>
                  </div>
                  <Button
                    disabled={applied}
                    onClick={() => applySuggestion(suggestion.id)}
                    type="button"
                  >
                    <Wand2 className="size-4" />
                    {applied ? "Aplicado" : "Aplicar"}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-md border bg-background p-3">
                    <div className="font-medium">Impacto esperado</div>
                    <p className="mt-1 text-muted-foreground">
                      {suggestion.expectedImpact}
                    </p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="font-medium">Dashboards afectados</div>
                    <p className="mt-1 text-muted-foreground">
                      {suggestion.affectedDashboards.join(", ")}
                    </p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="font-medium">Trazabilidad</div>
                    <p className="mt-1 text-muted-foreground">
                      {suggestion.sourceTrace}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="grid gap-3">
          <div className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="size-4 text-primary" />
              Insights para mejorar lectura
            </div>
            <div className="grid gap-3 text-sm leading-6 text-muted-foreground">
              <p>
                En plantillas de resultados, separar venta, costo directo,
                gasto operativo y utilidad para que Finanzas no duplique
                informacion de Operacion.
              </p>
              <p>
                En dashboards operativos, mostrar primero grafica, meta y
                brecha; dejar texto largo solo como detalle expandible.
              </p>
              <p>
                En Salud financiera, bloquear conclusiones si faltan costos
                variables, costos fijos o trazabilidad de sucursal.
              </p>
            </div>
          </div>

          <div className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4 text-primary" />
              Lo que hace el boton Aplicar
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              En DEMO marca la recomendacion como aplicada y recalcula el score
              de confiabilidad. En produccion debe crear una tarea auditada para
              modificar plantilla, conector o dashboard con aprobacion humana.
            </p>
          </div>
        </aside>
      </section>
    </section>
  );
}

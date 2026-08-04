"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  CircleGauge,
  Clock3,
  DatabaseZap,
  Download,
  Eye,
  FileSpreadsheet,
  FileUp,
  GitBranch,
  History,
  LockKeyhole,
  RefreshCcw,
  ServerCog,
  ShieldCheck,
  Upload,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManualMonthlyEntryDashboard } from "@/components/manual-monthly-entry-dashboard";
import { ReadableTabs } from "@/components/readable-tabs";
import {
  bulkImportDocuments,
  buildCsvTemplate,
  buildImportCoverageSummary,
  connectorPlans,
  getConnectorsForLine,
  getDocumentsForLine,
  getFallbackDocumentsForConnector,
  importBatchRuns,
  importBusinessLines,
  importPipelineSteps,
  type BulkImportDocument,
  type BulkImportStatus,
  type ConnectorStatus,
  type ImportBusinessLine,
  type ImportFrequency,
} from "@/lib/analytics/import-operations";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";
const allLines = "Todas" as const;
const allStatuses = "Todos los estados" as const;
const allFrequencies = "Todas las frecuencias" as const;

type StoredContext = {
  countryName?: string;
  companyName?: string;
  businessLineId?: string;
  businessLineName?: string;
  branchName?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  isDemo?: boolean;
};

type ImportLineFilter = ImportBusinessLine | typeof allLines;
type StatusFilter = BulkImportStatus | typeof allStatuses;
type FrequencyFilter = ImportFrequency | typeof allFrequencies;

const statusOrder: BulkImportStatus[] = [
  "Pendiente de carga",
  "Listo para cargar",
  "Con errores",
  "Validado",
  "Importado",
  "Reemplazado",
  "Archivado",
];

const frequencyOrder: ImportFrequency[] = [
  "Diario",
  "Semanal",
  "Quincenal",
  "Mensual",
  "Al cierre",
  "Bajo demanda",
];

const lineColors: Record<ImportBusinessLine, string> = {
  Consolidado: "bg-slate-700",
  Fisioterapia: "bg-emerald-600",
  Imagenes: "bg-sky-600",
  Laboratorio: "bg-indigo-600",
};

function readStoredContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawContext =
    window.localStorage.getItem(storageKey) ??
    window.sessionStorage.getItem(storageKey);

  if (!rawContext) {
    return null;
  }

  try {
    return JSON.parse(rawContext) as StoredContext;
  } catch {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

function resolveLineFromContext(context: StoredContext | null): ImportLineFilter {
  const lineText = [
    context?.businessLineId,
    context?.businessLineName,
    context?.companyName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (lineText.includes("laboratorio")) {
    return "Laboratorio";
  }

  if (lineText.includes("fisioterapia")) {
    return "Fisioterapia";
  }

  if (lineText.includes("imagen")) {
    return "Imagenes";
  }

  return allLines;
}

function formatPeriod(context: StoredContext | null) {
  if (context?.period) {
    return context.period;
  }

  if (context?.periodStart && context?.periodEnd) {
    return `${context.periodStart} a ${context.periodEnd}`;
  }

  return "Rango pendiente";
}

function statusClass(status: BulkImportStatus | ConnectorStatus) {
  if (status === "Validado" || status === "Importado" || status === "Conectado DEMO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (
    status === "Con errores" ||
    status === "Pendiente credenciales" ||
    status === "Pendiente API" ||
    status === "No disponible" ||
    status === "Deshabilitado real"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (status === "Archivado") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function riskClass(risk: BulkImportDocument["piiRisk"]) {
  if (risk === "Alto") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (risk === "Medio") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function sanitizeDownloadName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getDisplayStatus(
  importDocument: BulkImportDocument,
  statusOverrides: Record<string, BulkImportStatus>,
) {
  return statusOverrides[importDocument.id] ?? importDocument.status;
}

function MetricCard({
  icon: Icon,
  label,
  note,
  value,
}: {
  icon: typeof FileSpreadsheet;
  label: string;
  note: string;
  value: string;
}) {
  return (
    <article className="grid min-h-32 gap-3 rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="text-2xl font-semibold tracking-normal">{value}</p>
      <p className="text-xs leading-5 text-muted-foreground">{note}</p>
    </article>
  );
}

function ScopeCard({
  context,
  selectedLine,
}: {
  context: StoredContext | null;
  selectedLine: ImportLineFilter;
}) {
  return (
    <aside className="rounded-md border bg-card p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-4 text-primary" />
        Filtro de importacion
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.companyName ?? "Vista consolidada"}</span>
        <span>{context?.branchName ?? "Todas las sucursales"}</span>
        <span>Linea activa: {selectedLine}</span>
        <span>Periodo: {formatPeriod(context)}</span>
      </div>
    </aside>
  );
}

function CoverageByLine({
  statusOverrides,
}: {
  statusOverrides: Record<string, BulkImportStatus>;
}) {
  const lineSummaries = importBusinessLines.map((line) => {
    const documents = getDocumentsForLine(line);
    const total = documents.length;
    const completed = documents.filter((importDocument) =>
      ["Validado", "Importado"].includes(
        getDisplayStatus(importDocument, statusOverrides),
      ),
    ).length;
    const errors = documents.filter(
      (importDocument) =>
        getDisplayStatus(importDocument, statusOverrides) === "Con errores",
    ).length;
    const completion = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completion,
      completed,
      errors,
      line,
      total,
    };
  });

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CircleGauge className="size-4 text-primary" />
          Cobertura de datos por linea
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Barras: documentos validados o importados. Amarillo: documentos con
          errores que aun no deben alimentar dashboards.
        </p>
      </div>
      <div className="grid gap-4">
        {lineSummaries.map((summary) => (
          <div className="grid gap-2" key={summary.line}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-medium">
                <span
                  className={cn("size-2 rounded-full", lineColors[summary.line])}
                />
                {summary.line}
              </div>
              <span className="text-muted-foreground">
                {summary.completed}/{summary.total} listos
                {summary.errors > 0 ? `, ${summary.errors} con errores` : ""}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", lineColors[summary.line])}
                style={{ width: `${summary.completion}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ImportFilters({
  frequencyFilter,
  selectedLine,
  setFrequencyFilter,
  setSelectedLine,
  setStatusFilter,
  statusFilter,
}: {
  frequencyFilter: FrequencyFilter;
  selectedLine: ImportLineFilter;
  setFrequencyFilter: (value: FrequencyFilter) => void;
  setSelectedLine: (value: ImportLineFilter) => void;
  setStatusFilter: (value: StatusFilter) => void;
  statusFilter: StatusFilter;
}) {
  return (
    <section className="grid gap-3 rounded-md border bg-card p-4 lg:grid-cols-3">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Linea de negocio</span>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) =>
            setSelectedLine(event.target.value as ImportLineFilter)
          }
          value={selectedLine}
        >
          <option value={allLines}>Todas las lineas</option>
          {importBusinessLines.map((line) => (
            <option key={line} value={line}>
              {line}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Estado de carga</span>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) =>
            setStatusFilter(event.target.value as StatusFilter)
          }
          value={statusFilter}
        >
          <option value={allStatuses}>{allStatuses}</option>
          {statusOrder.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Frecuencia</span>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) =>
            setFrequencyFilter(event.target.value as FrequencyFilter)
          }
          value={frequencyFilter}
        >
          <option value={allFrequencies}>{allFrequencies}</option>
          {frequencyOrder.map((frequency) => (
            <option key={frequency} value={frequency}>
              {frequency}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function DocumentRow({
  active,
  importDocument,
  onSelect,
  status,
}: {
  active: boolean;
  importDocument: BulkImportDocument;
  onSelect: () => void;
  status: BulkImportStatus;
}) {
  return (
    <button
      className={cn(
        "grid gap-3 rounded-md border bg-card p-4 text-left transition-colors hover:border-primary/50",
        active && "border-primary bg-primary/5",
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold tracking-normal">
              {importDocument.name}
            </h3>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              DEMO
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {importDocument.purpose}
          </p>
        </div>
        <Badge className={statusClass(status)}>{status}</Badge>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <span>
          <strong className="font-medium text-foreground">Linea:</strong>{" "}
          {importDocument.businessLine}
        </span>
        <span>
          <strong className="font-medium text-foreground">Frecuencia:</strong>{" "}
          {importDocument.frequency}
        </span>
        <span>
          <strong className="font-medium text-foreground">Proxima:</strong>{" "}
          {importDocument.nextDueAt}
        </span>
      </div>
    </button>
  );
}

function DocumentDetail({
  importDocument,
  onDownload,
  onFileChange,
  onReplace,
  onValidate,
  onPublish,
  selectedFileName,
  status,
}: {
  importDocument: BulkImportDocument;
  onDownload: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onReplace: () => void;
  onValidate: () => void;
  onPublish: () => void;
  selectedFileName: string;
  status: BulkImportStatus;
}) {
  const inputId = `file-${importDocument.id}`;

  return (
    <aside className="grid gap-4 rounded-md border bg-card p-4">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            DEMO
          </Badge>
          <Badge variant="outline">{importDocument.businessLine}</Badge>
          <Badge className={statusClass(status)}>{status}</Badge>
          <Badge className={riskClass(importDocument.piiRisk)}>
            Riesgo PII {importDocument.piiRisk}
          </Badge>
        </div>
        <h2 className="text-xl font-semibold tracking-normal">
          {importDocument.name}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {importDocument.purpose}
        </p>
      </div>

      <div className="grid gap-2 rounded-md border bg-muted/40 p-3 text-xs leading-5">
        <div className="flex items-center gap-2 font-medium">
          <FileSpreadsheet className="size-4 text-primary" />
          Documento que debe cargar operaciones
        </div>
        <span>Responsable: {importDocument.ownerRole}</span>
        <span>Frecuencia: {importDocument.frequency}</span>
        <span>Fecha limite: {importDocument.deadline}</span>
        <span>Formatos: {importDocument.acceptedFormats.join(", ")}</span>
        <span>Plantilla: {importDocument.sourceTemplate}</span>
      </div>

      <div className="grid gap-2">
        <div className="text-sm font-medium">Acciones de carga</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={onDownload} type="button" variant="outline">
            <Download className="size-4" />
            Descargar estructura
          </Button>
          <Input
            accept={importDocument.acceptedFormats.join(",")}
            className="hidden"
            id={inputId}
            onChange={onFileChange}
            type="file"
          />
          <Button asChild type="button" variant="outline">
            <label className="cursor-pointer" htmlFor={inputId}>
              <Upload className="size-4" />
              Seleccionar archivo
            </label>
          </Button>
          <Button onClick={onValidate} type="button" variant="secondary">
            <ServerCog className="size-4" />
            Validar en servidor
          </Button>
          <Button onClick={onPublish} type="button">
            <CheckCircle2 className="size-4" />
            Confirmar publicacion
          </Button>
          <Button onClick={onReplace} type="button" variant="outline">
            <RefreshCcw className="size-4" />
            Reemplazar version
          </Button>
          <Button type="button" variant="outline">
            <History className="size-4" />
            Ver trazabilidad
          </Button>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Archivo seleccionado: {selectedFileName || "ninguno"}. Esta pantalla
          simula el flujo DEMO; la lectura real debe ocurrir en servidor.
        </p>
      </div>

      <div className="grid gap-3">
        <InfoList
          icon={GitBranch}
          items={importDocument.keyFields}
          title="Campos obligatorios"
        />
        <InfoList
          icon={ShieldCheck}
          items={importDocument.validationRules}
          title="Validaciones"
        />
        <InfoList
          icon={AlertTriangle}
          items={importDocument.blockingRules}
          title="Errores bloqueantes"
        />
      </div>

      <div className="grid gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
        <div className="flex items-center gap-2 font-medium">
          <Archive className="size-4" />
          Como se actualiza
        </div>
        <p>{importDocument.updateRule}</p>
        <p>
          Mientras no exista conector: {importDocument.connectorFallback}. Cada
          KPI publicado mantiene fuente, archivo, version, usuario y periodo.
        </p>
      </div>
    </aside>
  );
}

function InfoList({
  icon: Icon,
  items,
  title,
}: {
  icon: typeof FileSpreadsheet;
  items: string[];
  title: string;
}) {
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      <ul className="grid gap-1 text-xs leading-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function BulkUploadPanel({
  documents,
  onDownload,
  onFileChange,
  onPublish,
  onReplace,
  onSelectDocument,
  onValidate,
  selectedDocument,
  selectedFileName,
  statusOverrides,
}: {
  documents: BulkImportDocument[];
  onDownload: (importDocument: BulkImportDocument) => void;
  onFileChange: (
    importDocument: BulkImportDocument,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onPublish: (importDocument: BulkImportDocument) => void;
  onReplace: (importDocument: BulkImportDocument) => void;
  onSelectDocument: (importDocument: BulkImportDocument) => void;
  onValidate: (importDocument: BulkImportDocument) => void;
  selectedDocument: BulkImportDocument;
  selectedFileName: string;
  statusOverrides: Record<string, BulkImportStatus>;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_480px]">
      <div className="grid gap-3">
        {documents.map((importDocument) => (
          <DocumentRow
            active={selectedDocument.id === importDocument.id}
            importDocument={importDocument}
            key={importDocument.id}
            onSelect={() => onSelectDocument(importDocument)}
            status={getDisplayStatus(importDocument, statusOverrides)}
          />
        ))}
      </div>

      <DocumentDetail
        importDocument={selectedDocument}
        onDownload={() => onDownload(selectedDocument)}
        onFileChange={(event) => onFileChange(selectedDocument, event)}
        onPublish={() => onPublish(selectedDocument)}
        onReplace={() => onReplace(selectedDocument)}
        onValidate={() => onValidate(selectedDocument)}
        selectedFileName={selectedFileName}
        status={getDisplayStatus(selectedDocument, statusOverrides)}
      />
    </section>
  );
}

function ConnectorPanel({
  connectors,
  onUseFallback,
}: {
  connectors: typeof connectorPlans;
  onUseFallback: (documentId: string) => void;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {connectors.map((connector) => {
        const fallbackDocuments = getFallbackDocumentsForConnector(connector);

        return (
          <article className="grid gap-4 rounded-md border bg-card p-4" key={connector.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    DEMO
                  </Badge>
                  <Badge variant="outline">{connector.businessLine}</Badge>
                  <Badge className={statusClass(connector.status)}>
                    {connector.status}
                  </Badge>
                </div>
                <h2 className="text-lg font-semibold tracking-normal">
                  {connector.system}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {connector.purpose}
                </p>
              </div>
              <DatabaseZap className="size-5 text-primary" />
            </div>

            <div className="grid gap-2 text-xs leading-5 text-muted-foreground">
              <span>
                <strong className="font-medium text-foreground">
                  Responsable:
                </strong>{" "}
                {connector.ownerRole}
              </span>
              <span>
                <strong className="font-medium text-foreground">
                  Credenciales:
                </strong>{" "}
                {connector.credentialRequirement}
              </span>
              <span>
                <strong className="font-medium text-foreground">
                  Fuente:
                </strong>{" "}
                {connector.endpointOrSource}
              </span>
              <span>
                <strong className="font-medium text-foreground">
                  Frecuencia:
                </strong>{" "}
                {connector.syncFrequency}
              </span>
              <span>
                <strong className="font-medium text-foreground">
                  Calidad:
                </strong>{" "}
                {connector.dataQualityGate}
              </span>
            </div>

            <div className="grid gap-2 rounded-md border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileUp className="size-4 text-primary" />
                Carga masiva que lo reemplaza por ahora
              </div>
              <div className="grid gap-2">
                {fallbackDocuments.map((importDocument) => (
                  <button
                    className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary/50"
                    key={importDocument.id}
                    onClick={() => onUseFallback(importDocument.id)}
                    type="button"
                  >
                    <span className="min-w-0">{importDocument.name}</span>
                    <Badge variant="outline">Usar carga</Badge>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
              <strong>Trazabilidad:</strong> {connector.auditTrail}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function PipelineSection() {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Workflow className="size-4 text-primary" />
          Flujo de actualizacion mensual
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Ningun cierre cambia los dashboards hasta pasar validacion, vista
          previa y publicacion con auditoria.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-7">
        {importPipelineSteps.map((step) => (
          <article className="grid gap-2 rounded-md border p-3" key={step.id}>
            <h3 className="text-sm font-semibold tracking-normal">
              {step.label}
            </h3>
            <p className="text-xs leading-5 text-muted-foreground">
              {step.description}
            </p>
            <div className="rounded-md bg-muted px-2 py-1 text-[11px] leading-4 text-muted-foreground">
              {step.owner}: {step.gate}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BatchHistorySection() {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <History className="size-4 text-primary" />
        Historial reciente DEMO
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Documento</th>
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Periodo</th>
              <th className="py-2 pr-4 font-medium">Responsable</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 font-medium">Calidad</th>
              <th className="py-2 pr-4 font-medium">Publica en</th>
            </tr>
          </thead>
          <tbody>
            {importBatchRuns.map((batchRun) => (
              <tr className="border-b last:border-b-0" key={batchRun.id}>
                <td className="py-3 pr-4">
                  <div className="font-medium">{batchRun.documentName}</div>
                  <div className="text-xs text-muted-foreground">
                    {batchRun.traceability}
                  </div>
                </td>
                <td className="py-3 pr-4">{batchRun.businessLine}</td>
                <td className="py-3 pr-4">{batchRun.period}</td>
                <td className="py-3 pr-4">{batchRun.owner}</td>
                <td className="py-3 pr-4">
                  <Badge className={statusClass(batchRun.status)}>
                    {batchRun.status}
                  </Badge>
                </td>
                <td className="py-3 pr-4">{batchRun.qualityScore}%</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {batchRun.publishedModules.length > 0
                    ? batchRun.publishedModules.join(", ")
                    : "No publicado"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GovernanceSection() {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <article className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <LockKeyhole className="size-4" />
          Seguridad
        </div>
        <p className="text-xs leading-5">
          Los formularios y respaldos Excel se validan en servidor. No deben
          guardar pacientes identificables ni publicar datos incompletos.
        </p>
      </article>
      <article className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <GitBranch className="size-4" />
          Trazabilidad
        </div>
        <p className="text-xs leading-5">
          Cada KPI debe conservar fuente, archivo, conector, lote, version,
          transformacion, usuario y periodo antes de mostrarse como confiable.
        </p>
      </article>
      <article className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Eye className="size-4" />
          Publicacion
        </div>
        <p className="text-xs leading-5">
          Operaciones puede cargar y validar. El webmaster administra
          conectores y reemplazos; el CEO ve solo datos publicados o alertas de
          calidad.
        </p>
      </article>
    </section>
  );
}

export function ImportOperationsDashboard() {
  const [context, setContext] = useState<StoredContext | null>(null);
  const [selectedLine, setSelectedLine] = useState<ImportLineFilter>(allLines);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(allStatuses);
  const [frequencyFilter, setFrequencyFilter] =
    useState<FrequencyFilter>(allFrequencies);
  const [activeSection, setActiveSection] = useState("formulario-importaciones");
  const [selectedDocumentId, setSelectedDocumentId] = useState(
    bulkImportDocuments[0]?.id ?? "",
  );
  const [selectedFileByDocument, setSelectedFileByDocument] = useState<
    Record<string, string>
  >({});
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, BulkImportStatus>
  >({});
  const [notice, setNotice] = useState(
    "El formulario mensual es la via manual principal. Excel queda como respaldo para migraciones o correcciones especiales.",
  );

  useEffect(() => {
    function refreshContext() {
      const nextContext = readStoredContext();
      setContext(nextContext);
      setSelectedLine(resolveLineFromContext(nextContext));
    }

    refreshContext();
    window.addEventListener("storage", refreshContext);
    window.addEventListener(contextChangeEvent, refreshContext);

    return () => {
      window.removeEventListener("storage", refreshContext);
      window.removeEventListener(contextChangeEvent, refreshContext);
    };
  }, []);

  const documentsForLine = useMemo(
    () => getDocumentsForLine(selectedLine),
    [selectedLine],
  );
  const filteredDocuments = useMemo(
    () =>
      documentsForLine.filter((importDocument) => {
        const status = getDisplayStatus(importDocument, statusOverrides);
        const statusMatches =
          statusFilter === allStatuses || status === statusFilter;
        const frequencyMatches =
          frequencyFilter === allFrequencies ||
          importDocument.frequency === frequencyFilter;

        return statusMatches && frequencyMatches;
      }),
    [documentsForLine, frequencyFilter, statusFilter, statusOverrides],
  );
  const connectors = useMemo(
    () => getConnectorsForLine(selectedLine),
    [selectedLine],
  );

  useEffect(() => {
    const currentDocumentIsVisible = filteredDocuments.some(
      (importDocument) => importDocument.id === selectedDocumentId,
    );

    if (!currentDocumentIsVisible) {
      setSelectedDocumentId(
        filteredDocuments[0]?.id ?? documentsForLine[0]?.id ?? "",
      );
    }
  }, [documentsForLine, filteredDocuments, selectedDocumentId]);

  const selectedDocument = useMemo(
    () =>
      filteredDocuments.find(
        (importDocument) => importDocument.id === selectedDocumentId,
      ) ??
      documentsForLine.find(
        (importDocument) => importDocument.id === selectedDocumentId,
      ) ??
      documentsForLine[0] ??
      bulkImportDocuments[0],
    [documentsForLine, filteredDocuments, selectedDocumentId],
  );

  const visibleDocuments =
    filteredDocuments.length > 0 ? filteredDocuments : documentsForLine;
  const selectedFileName = selectedFileByDocument[selectedDocument.id] ?? "";
  const baseSummary = buildImportCoverageSummary(selectedLine);
  const currentSummary = {
    ...baseSummary,
    pendingRequired: documentsForLine.filter((importDocument) => {
      const status = getDisplayStatus(importDocument, statusOverrides);
      return (
        importDocument.required &&
        ["Pendiente de carga", "Listo para cargar", "Con errores"].includes(
          status,
        )
      );
    }).length,
    validatedOrImported: documentsForLine.filter((importDocument) =>
      ["Validado", "Importado"].includes(
        getDisplayStatus(importDocument, statusOverrides),
      ),
    ).length,
  };

  function downloadTemplate(importDocument: BulkImportDocument) {
    const blob = new Blob([buildCsvTemplate(importDocument)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${sanitizeDownloadName(importDocument.name)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`Estructura DEMO descargada para ${importDocument.name}.`);
  }

  function handleFileChange(
    importDocument: BulkImportDocument,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const fileName = event.target.files?.[0]?.name;

    if (!fileName) {
      return;
    }

    setSelectedFileByDocument((currentValue) => ({
      ...currentValue,
      [importDocument.id]: fileName,
    }));
    setStatusOverrides((currentValue) => ({
      ...currentValue,
      [importDocument.id]: "Listo para cargar",
    }));
    setNotice(
      `${fileName} quedo seleccionado para ${importDocument.name}. Falta validarlo en servidor antes de publicar.`,
    );
  }

  function setDocumentStatus(
    importDocument: BulkImportDocument,
    status: BulkImportStatus,
    message: string,
  ) {
    setStatusOverrides((currentValue) => ({
      ...currentValue,
      [importDocument.id]: status,
    }));
    setNotice(message);
  }

  function validateDocument(importDocument: BulkImportDocument) {
    setDocumentStatus(
      importDocument,
      "Validado",
      `${importDocument.name} paso a Validado DEMO. En produccion aqui se ejecutan reglas de servidor.`,
    );
  }

  function publishDocument(importDocument: BulkImportDocument) {
    setDocumentStatus(
      importDocument,
      "Importado",
      `${importDocument.name} quedo Importado DEMO y listo para alimentar dashboards publicados.`,
    );
  }

  function replaceDocument(importDocument: BulkImportDocument) {
    setDocumentStatus(
      importDocument,
      "Reemplazado",
      `${importDocument.name} quedo marcado como version reemplazada DEMO con auditoria pendiente.`,
    );
  }

  function useFallbackDocument(documentId: string) {
    setSelectedDocumentId(documentId);
    setActiveSection("carga-importaciones");
    setNotice(
      "Conector sin credenciales: se abrira la carga masiva que mantiene actualizado ese dato.",
    );
  }

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              Entorno DEMO
            </Badge>
            <Badge variant="outline">Gerente de operaciones</Badge>
            <Badge variant="outline">Webmaster / Administrador</Badge>
          </div>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              Importaciones operativas
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
              Centro para mantener Analiza actualizado mientras no existan
              conectores: formulario mensual por linea de negocio, validacion,
              historial, auditoria y respaldo por documento cuando sea necesario.
            </p>
          </div>
        </div>
        <ScopeCard context={context} selectedLine={selectedLine} />
      </div>

      <ReadableTabs
        activeTabId={activeSection}
        onTabChange={setActiveSection}
        tabs={[
          {
            id: "formulario-importaciones",
            label: "Formulario mensual",
            description: "Entrada manual principal por sucursal.",
            children: <ManualMonthlyEntryDashboard />,
          },
          {
            id: "control-importaciones",
            label: "Control de carga",
            description: "Pendientes, errores y cobertura por linea.",
            children: (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricCard
                    icon={FileSpreadsheet}
                    label="Documentos requeridos"
                    note="Obligatorios para que los KPIs no queden incompletos."
                    value={`${currentSummary.requiredDocuments}`}
                  />
                  <MetricCard
                    icon={Clock3}
                    label="Pendientes requeridos"
                    note={`Proxima fecha: ${currentSummary.nextDueAt}.`}
                    value={`${currentSummary.pendingRequired}`}
                  />
                  <MetricCard
                    icon={CheckCircle2}
                    label="Validados/importados"
                    note="Listos para alimentar dashboards publicados."
                    value={`${currentSummary.validatedOrImported}`}
                  />
                  <MetricCard
                    icon={DatabaseZap}
                    label="Conectores pendientes"
                    note="Mientras tanto se usa carga masiva."
                    value={`${currentSummary.pendingConnectors}`}
                  />
                  <MetricCard
                    icon={AlertTriangle}
                    label="Con errores"
                    note="No publican datos hasta corregirlos."
                    value={`${currentSummary.errorDocuments}`}
                  />
                </div>
                <CoverageByLine statusOverrides={statusOverrides} />
              </>
            ),
          },
          {
            id: "carga-importaciones",
            label: "Carga masiva",
            description: "Uso excepcional para Excel/CSV.",
            children: (
              <>
                <ImportFilters
                  frequencyFilter={frequencyFilter}
                  selectedLine={selectedLine}
                  setFrequencyFilter={setFrequencyFilter}
                  setSelectedLine={setSelectedLine}
                  setStatusFilter={setStatusFilter}
                  statusFilter={statusFilter}
                />
                <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  {notice}
                </div>
                <BulkUploadPanel
                  documents={visibleDocuments}
                  onDownload={downloadTemplate}
                  onFileChange={handleFileChange}
                  onPublish={publishDocument}
                  onReplace={replaceDocument}
                  onSelectDocument={(importDocument) =>
                    setSelectedDocumentId(importDocument.id)
                  }
                  onValidate={validateDocument}
                  selectedDocument={selectedDocument}
                  selectedFileName={selectedFileName}
                  statusOverrides={statusOverrides}
                />
              </>
            ),
          },
          {
            id: "conectores-importaciones",
            label: "Conectores",
            description: "APIs, credenciales y fallback manual.",
            children: (
              <>
                <div className="rounded-md border bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Los conectores son la via automatica. Si no hay credenciales,
                  el sistema conserva formulario mensual o carga masiva como
                  respaldo trazable.
                </div>
                <ConnectorPanel
                  connectors={connectors}
                  onUseFallback={useFallbackDocument}
                />
              </>
            ),
          },
          {
            id: "historial-importaciones",
            label: "Historial y gobierno",
            description: "Pipeline, auditoria y reglas.",
            children: (
              <>
                <PipelineSection />
                <BatchHistorySection />
                <GovernanceSection />
              </>
            ),
          },
        ]}
      />
    </section>
  );
}

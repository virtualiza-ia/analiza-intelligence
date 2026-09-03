"use client";

import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  Globe2,
  Save,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ClosureFormTone = "emerald" | "sky" | "teal";

export type ClosureContextItem = {
  label: string;
  note: string;
  value: string;
};

type ClosureToneStyles = {
  activeStep: string;
  eyebrow: string;
  lineCard: string;
  progress: string;
};

const toneStyles: Record<ClosureFormTone, ClosureToneStyles> = {
  emerald: {
    activeStep: "border-emerald-700 bg-emerald-700 text-white shadow-sm",
    eyebrow: "text-emerald-700",
    lineCard: "border-emerald-300 bg-emerald-50 text-emerald-950",
    progress: "bg-emerald-700",
  },
  sky: {
    activeStep: "border-sky-700 bg-sky-700 text-white shadow-sm",
    eyebrow: "text-sky-700",
    lineCard: "border-sky-300 bg-sky-50 text-sky-950",
    progress: "bg-sky-700",
  },
  teal: {
    activeStep: "border-teal-700 bg-teal-700 text-white shadow-sm",
    eyebrow: "text-teal-700",
    lineCard: "border-teal-300 bg-teal-50 text-teal-950",
    progress: "bg-teal-700",
  },
};

function contextIcon(index: number) {
  if (index === 0) {
    return <ClipboardCheck className="size-4" />;
  }

  if (index === 1) {
    return <Globe2 className="size-4" />;
  }

  if (index === 2) {
    return <BriefcaseBusiness className="size-4" />;
  }

  return <Building2 className="size-4" />;
}

export function MonthlyClosureFormHeader({
  contextItems,
  currentStep,
  lineLabel,
  progress,
  stepCount,
  tone,
}: {
  contextItems: ClosureContextItem[];
  currentStep: number;
  lineLabel: string;
  progress: number;
  stepCount: number;
  tone: ClosureFormTone;
}) {
  const styles = toneStyles[tone];

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid max-w-4xl gap-1">
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            Cierre mensual controlado
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            Formulario por linea de negocio, versionado y sin datos personales
            de pacientes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Sin PII</Badge>
          <Badge variant="outline">RLS</Badge>
          <Badge variant="outline">Versionado</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {contextItems.map((item, index) => (
          <div
            className={cn(
              "grid gap-2 rounded-md border bg-background p-3",
              index === 0 ? styles.lineCard : "",
            )}
            key={item.label}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {contextIcon(index)}
              {item.label}
            </div>
            <div className="truncate text-base font-medium">{item.value}</div>
            <div className="text-xs leading-5 text-muted-foreground">
              {item.note}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-md border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold">Avance de secciones</div>
          <div className="text-sm font-semibold text-muted-foreground">
            {currentStep}/{stepCount} · {progress}%
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted">
          <div
            className={cn("h-2 rounded-full", styles.progress)}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        Linea activa: {lineLabel}
      </div>
    </section>
  );
}

export function MonthlyClosureStepTabs({
  activeStep,
  onStepChange,
  steps,
  tone,
}: {
  activeStep: number;
  onStepChange: (stepIndex: number) => void;
  steps: string[];
  tone: ClosureFormTone;
}) {
  const styles = toneStyles[tone];

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
      {steps.map((step, index) => (
        <button
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            activeStep === index
              ? styles.activeStep
              : "bg-background text-foreground hover:bg-accent",
          )}
          key={step}
          onClick={() => onStepChange(index)}
          type="button"
        >
          {index + 1}. {step}
        </button>
      ))}
    </div>
  );
}

export function MonthlyClosureStepSection({
  children,
  description,
  footer,
  helperText,
  lineLabel,
  stepIndex,
  stepTitle,
  totalSteps,
  tone,
}: {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  helperText?: string;
  lineLabel: string;
  stepIndex: number;
  stepTitle: string;
  totalSteps: number;
  tone: ClosureFormTone;
}) {
  const styles = toneStyles[tone];

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid gap-1">
          <div
            className={cn(
              "text-xs font-semibold uppercase tracking-normal",
              styles.eyebrow,
            )}
          >
            {lineLabel} · Seccion {stepIndex + 1} de {totalSteps}
          </div>
          <h2 className="text-xl font-semibold tracking-normal">
            {stepTitle}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {helperText ? (
          <div className="rounded-full border bg-background px-3 py-1 text-sm font-medium">
            {helperText}
          </div>
        ) : null}
      </div>
      <div className="mt-6">{children}</div>
      <div className="mt-6 border-t pt-4">{footer}</div>
    </section>
  );
}

export function MonthlyClosureWizardActions({
  activeStep,
  canCreateClosure,
  lastSavedAt,
  onPrevious,
  onSave,
  onNext,
  saving,
  totalSteps,
  versionedCorrection,
}: {
  activeStep: number;
  canCreateClosure: boolean;
  lastSavedAt: string;
  onNext: () => void;
  onPrevious: () => void;
  onSave: () => void;
  saving: boolean;
  totalSteps: number;
  versionedCorrection: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
      <Button
        className="justify-self-start"
        disabled={activeStep === 0}
        onClick={onPrevious}
        type="button"
        variant="outline"
      >
        <ArrowLeft className="size-4" />
        Anterior
      </Button>

      <div className="flex flex-wrap items-center justify-center gap-3 text-center text-xs text-muted-foreground">
        <span>
          {saving ? "Guardando..." : "Autosave activo"}
          {lastSavedAt ? ` / ultimo guardado ${lastSavedAt}` : ""}
          {versionedCorrection ? " / correccion versionada" : ""}
        </span>
        <Button
          disabled={saving || !canCreateClosure}
          onClick={onSave}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Save className="size-4" />
          Guardar
        </Button>
      </div>

      <Button
        className="justify-self-end"
        disabled={activeStep >= totalSteps - 1}
        onClick={onNext}
        type="button"
      >
        Siguiente
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

export function ProtectedClosureNotice({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm font-medium">
      <ShieldCheck className="size-4 text-emerald-700" />
      {children}
    </div>
  );
}

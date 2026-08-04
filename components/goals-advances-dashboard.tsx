"use client";

import { useState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Goal,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatMoney,
  goalStrategySuggestions,
  type GoalStrategySuggestion,
} from "@/lib/analytics/business-control-center";
import { useActiveBusinessLine } from "@/hooks/use-active-business-line";

function confidenceClass(confidence: GoalStrategySuggestion["confidence"]) {
  if (confidence === "Alta") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (confidence === "Media") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-slate-100 text-slate-800 hover:bg-slate-100";
}

function formatRate(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
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

export function GoalsAdvancesDashboard() {
  const activeBusinessLine = useActiveBusinessLine();
  const [approvedIds, setApprovedIds] = useState<Set<string>>(() => new Set());
  const visibleGoalSuggestions =
    activeBusinessLine.isConsolidated
      ? goalStrategySuggestions
      : goalStrategySuggestions.filter(
          (goal) => goal.line === activeBusinessLine.line,
        );
  const visibleApprovedCount = visibleGoalSuggestions.filter((goal) =>
    approvedIds.has(goal.id),
  ).length;
  const visibleBonusTotal = visibleGoalSuggestions.reduce(
    (total, goal) => total + goal.bonusPoolSuggestion,
    0,
  );
  const averageRoi =
    visibleGoalSuggestions.length > 0
      ? visibleGoalSuggestions.reduce(
          (total, goal) =>
            total + (goal.simulatedRoiLow + goal.simulatedRoiHigh) / 2,
          0,
        ) / visibleGoalSuggestions.length
      : 0;

  function toggleApproval(id: string) {
    setApprovedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              Entorno DEMO
            </Badge>
            <Badge variant="outline">Sugerencias cautelosas, no automaticas</Badge>
            <Badge variant="outline">Filtro: {activeBusinessLine.line}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-card">
              <Goal className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Metas, avances, bonos y ROI simulado
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                AnaliA sugiere metas por linea y sucursal usando escenarios
                conservadores. El CEO define la meta final y puede aceptar,
                editar o rechazar cada sugerencia.
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-md border bg-card p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <ShieldCheck className="size-4 text-primary" />
            Regla de cautela
          </div>
          <p className="leading-6 text-muted-foreground">
            El ROI mostrado es un rango DEMO simulado con supuestos visibles. No
            debe aprobarse una meta si faltan costos, capacidad o calidad de
            datos suficiente.
          </p>
        </aside>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { icon: Target, label: "Metas sugeridas", value: visibleGoalSuggestions.length },
          { icon: CheckCircle2, label: "Aprobadas DEMO", value: visibleApprovedCount },
          { icon: BadgeDollarSign, label: "Bonos sugeridos", value: formatMoney(visibleBonusTotal) },
          { icon: TrendingUp, label: "ROI medio", value: `${averageRoi.toFixed(2)}x` },
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

      <section className="grid gap-4">
        {visibleGoalSuggestions.map((goal) => {
          const approved = approvedIds.has(goal.id);
          const targetProgress =
            (goal.currentMonthlyRevenue / goal.suggestedGoalRevenue) * 100;

          return (
            <article className="rounded-md border bg-card p-4" key={goal.id}>
              <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{goal.line}</Badge>
                    <Badge variant="outline">{goal.branch}</Badge>
                    <Badge className={confidenceClass(goal.confidence)}>
                      Confianza {goal.confidence}
                    </Badge>
                    {approved ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        Aprobada DEMO
                      </Badge>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">
                    Meta sugerida: {formatMoney(goal.suggestedGoalRevenue)}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Actual: {formatMoney(goal.currentMonthlyRevenue)} · crecimiento
                    cauteloso sugerido {formatRate(goal.conservativeGrowthRate)} ·
                    gerente: {goal.manager}
                  </p>
                  <div className="mt-3">
                    <ProgressBar value={targetProgress} />
                    <div className="mt-1 text-xs text-muted-foreground">
                      Avance base contra meta sugerida: {Math.round(targetProgress)}%
                    </div>
                  </div>
                </div>

                <div className="rounded-md border bg-background p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <LineChart className="size-4 text-primary" />
                    ROI simulado si se ejecuta bien
                  </div>
                  <div className="text-3xl font-semibold">
                    {goal.simulatedRoiLow.toFixed(2)}x - {goal.simulatedRoiHigh.toFixed(2)}x
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Rango conservador basado en supuestos DEMO; debe recalcularse
                    con costos reales antes de aprobar.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-3">
                <div className="rounded-md border bg-background p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="size-4 text-primary" />
                    Estrategia sugerida
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {goal.strategy}
                  </p>
                </div>

                <div className="rounded-md border bg-background p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <BadgeDollarSign className="size-4 text-primary" />
                    Colocacion de bonos
                  </div>
                  <div className="text-lg font-semibold">
                    {formatMoney(goal.bonusPoolSuggestion)}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {goal.bonusRule}
                  </p>
                </div>

                <div className="rounded-md border bg-background p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="size-4 text-primary" />
                    Condicion para aprobar
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {goal.guardrail}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_180px] xl:items-center">
                <div className="rounded-md border bg-muted/60 p-3">
                  <div className="mb-2 text-sm font-medium">Supuestos visibles</div>
                  <div className="grid gap-1 text-sm text-muted-foreground">
                    {goal.assumptions.map((assumption) => (
                      <span className="flex gap-2" key={assumption}>
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                        {assumption}
                      </span>
                    ))}
                  </div>
                </div>
                <Button onClick={() => toggleApproval(goal.id)} type="button">
                  {approved ? "Quitar aprobacion" : "Aprobar DEMO"}
                </Button>
              </div>
            </article>
          );
        })}
        {visibleGoalSuggestions.length === 0 ? (
          <article className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
            No hay metas sugeridas para el filtro superior actual. Selecciona
            otra linea de negocio o carga plantillas suficientes para generar
            sugerencias cautelosas.
          </article>
        ) : null}
      </section>
    </section>
  );
}

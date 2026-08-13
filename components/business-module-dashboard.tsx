"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  LineChart,
  LockKeyhole,
  UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  moduleConfigs,
  type ModuleConfig,
  type ModuleInsight,
  type ModuleMetric,
} from "@/lib/analytics/demo-business-modules";
import {
  demoBranches,
  demoCountryOptions,
  demoCompanyOptions,
  demoOperationalAreas,
  demoRoleProfiles,
  roleKeys,
  type RoleKey,
} from "@/lib/tenant/demo-context";
import {
  buildSoftDeactivationPlan,
  canCreateBranch,
  canCreateOperationalArea,
  canInviteUser,
  getCreatableRoles,
  isSuperAdministrator,
  type DelegationActor,
  type ScopeBoundary,
} from "@/lib/tenant/delegation-policy";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";
const roleStorageKey = "analiza:demo-role";
const roleChangeEvent = "analiza:role-change";
const demoUsersStorageKey = "analiza:demo-users";
const revokedDemoUserEmails = new Set(["info@tuvetsv.com"]);

type StoredContext = {
  countryName: string;
  companyName: string;
  branchName: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  isDemo: boolean;
};

type BusinessModuleDashboardProps = {
  enableDemoFixtures?: boolean;
  module: string;
};

type DemoManagedUser = {
  id: string;
  fullName: string;
  email: string;
  roleKey: RoleKey;
  organizationScope: string;
  countryScope: string;
  businessScope: string;
  areaScope?: string;
  branchScope: string;
  status: "Activo" | "Pendiente invitacion" | "Inactivo";
  createdAt: string;
  deactivatedAt?: string;
  invitationStatus?: "Pendiente" | "Aceptada" | "Revocada";
  reassignmentRequired?: boolean;
};

type InviteUserApiResponse = {
  error?: string;
  expiresAt?: string;
  invitationId?: string;
  missingConfig?: string[];
  ok?: boolean;
  status?: "sent";
};

const businessHealth = [
  {
    business: "Fisioterapia",
    financial: 89,
    operational: 91,
    target: 94,
    note: "Alta demanda, vigilar asistencia efectiva",
  },
  {
    business: "Laboratorio",
    financial: 78,
    operational: 86,
    target: 90,
    note: "Costo variable y tiempos de entrega en observacion",
  },
  {
    business: "Imagenes",
    financial: 74,
    operational: 80,
    target: 87,
    note: "Capacidad ociosa y costos fijos pendientes",
  },
];

const allBusinessScope = "Todas las lineas de negocio";
const allCountryScope = "Todos los paises";
const allAreaScope = "Todas las gerencias de area";
const allBranchScope = "Todas las sucursales";
const demoOrganizationId = "10000000-0000-4000-8000-000000000001";
const formSelectClassName =
  "h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
const tableSelectClassName =
  "h-9 w-full min-w-0 rounded-md border bg-background px-2 text-xs outline-none disabled:opacity-60";
const initialDemoUsers: DemoManagedUser[] = [
  {
    id: "demo-admin",
    fullName: "Administrador DEMO",
    email: "admin.demo@analiza.local",
    roleKey: "super_admin",
    organizationScope: "Grupo Analiza DEMO",
    countryScope: allCountryScope,
    businessScope: allBusinessScope,
    areaScope: allAreaScope,
    branchScope: allBranchScope,
    status: "Activo",
    createdAt: "2026-07-21",
  },
];

function readStoredContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawContext = window.localStorage.getItem(storageKey);
  if (!rawContext) {
    return null;
  }

  try {
    return JSON.parse(rawContext) as StoredContext;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

function readActiveDemoRole(): RoleKey {
  if (typeof window === "undefined") {
    return "super_admin";
  }

  const storedRole = window.localStorage.getItem(roleStorageKey);

  if (roleKeys.includes(storedRole as RoleKey)) {
    return storedRole as RoleKey;
  }

  return "super_admin";
}

function readDemoUsers(enableDemoFixtures: boolean) {
  if (!enableDemoFixtures) {
    return [];
  }

  if (typeof window === "undefined") {
    return initialDemoUsers;
  }

  const rawUsers = window.localStorage.getItem(demoUsersStorageKey);
  if (!rawUsers) {
    return initialDemoUsers;
  }

  try {
    const parsedUsers = JSON.parse(rawUsers) as DemoManagedUser[];
    const visibleUsers = parsedUsers.filter(
      (user) => !revokedDemoUserEmails.has(user.email.toLowerCase()),
    );

    if (visibleUsers.length !== parsedUsers.length) {
      persistDemoUsers(visibleUsers.length > 0 ? visibleUsers : initialDemoUsers);
    }

    return visibleUsers.length > 0 ? visibleUsers : initialDemoUsers;
  } catch {
    window.localStorage.removeItem(demoUsersStorageKey);
    return initialDemoUsers;
  }
}

function persistDemoUsers(users: DemoManagedUser[]) {
  window.localStorage.setItem(demoUsersStorageKey, JSON.stringify(users));
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildScopeBoundary({
  areaScope,
  branchScope,
  businessScope,
  countryScope,
}: {
  areaScope?: string;
  branchScope: string;
  businessScope: string;
  countryScope: string;
}): ScopeBoundary {
  return {
    branchId: branchScope === allBranchScope ? null : branchScope,
    companyId: businessScope === allBusinessScope ? null : businessScope,
    countryId: countryScope === allCountryScope ? null : countryScope,
    operationalAreaId:
      !areaScope || areaScope === allAreaScope ? null : areaScope,
    organizationId: demoOrganizationId,
  };
}

function buildDelegationActor(
  roleKey: RoleKey,
  scope: {
    areaScope?: string;
    branchScope: string;
    businessScope: string;
    countryScope: string;
  },
): DelegationActor {
  return {
    canInviteOperationalUsers: roleKey === "gerente_sucursal",
    roleKey,
    scope: buildScopeBoundary(scope),
    userId: "active-demo-user",
  };
}

function getRoleOptionsForValue(roleKey: RoleKey) {
  return roleKeys.includes(roleKey) ? roleKeys : [roleKey, ...roleKeys];
}

function getDefaultRoleForActor(actorRole: RoleKey) {
  return getCreatableRoles(actorRole, {
    canInviteOperationalUsers: actorRole === "gerente_sucursal",
  })[0] ?? "viewer";
}

function readInviteUserApiResponse(value: unknown): InviteUserApiResponse {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const response = value as Record<string, unknown>;
  const missingConfig = Array.isArray(response.missingConfig)
    ? response.missingConfig.filter(
        (configName): configName is string => typeof configName === "string",
      )
    : undefined;

  return {
    error: typeof response.error === "string" ? response.error : undefined,
    expiresAt:
      typeof response.expiresAt === "string" ? response.expiresAt : undefined,
    invitationId:
      typeof response.invitationId === "string"
        ? response.invitationId
        : undefined,
    missingConfig,
    ok: response.ok === true,
    status: response.status === "sent" ? "sent" : undefined,
  };
}

function getCountryScopeLabel(countryScope: string) {
  return (
    demoCountryOptions.find((country) => country.id === countryScope)?.name ??
    countryScope
  );
}

function getBusinessScopeLabel(businessScope: string) {
  return (
    demoCompanyOptions.find((company) => company.id === businessScope)?.name ??
    businessScope
  );
}

function getAreaScopeLabel(areaScope?: string) {
  if (!areaScope) {
    return allAreaScope;
  }

  return (
    demoOperationalAreas.find((area) => area.id === areaScope)?.name ??
    areaScope
  );
}

function getBranchScopeLabel(branchScope: string) {
  return (
    demoBranches.find((branch) => branch.id === branchScope)?.name ??
    branchScope
  );
}

function metricToneClass(tone: ModuleMetric["tone"]) {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (tone === "negative") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-border bg-muted text-muted-foreground";
}

function priorityClass(priority: ModuleInsight["priority"]) {
  if (priority === "alta") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (priority === "media") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
}

function MetricCard({ metric }: { metric: ModuleMetric }) {
  return (
    <article className="metric-card flex min-h-32 flex-col justify-between rounded-lg border p-4">
      <div className="grid gap-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          {metric.label}
        </h2>
        <p className="text-2xl font-semibold tracking-normal">
          {metric.value}
        </p>
      </div>
      <span
        className={cn(
          "w-fit rounded-full border px-2.5 py-1 text-xs font-medium",
          metricToneClass(metric.tone),
        )}
      >
        {metric.note}
      </span>
    </article>
  );
}

function HealthBar({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number;
  tone?: "primary" | "muted";
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn(
            "h-2 rounded-full",
            tone === "primary" ? "bg-primary" : "bg-muted-foreground",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ScopeCard({ context }: { context: StoredContext | null }) {
  const period =
    context?.period ??
    (context?.periodStart && context?.periodEnd
      ? `${context.periodStart} a ${context.periodEnd}`
      : "Rango pendiente");

  return (
    <aside className="rounded-lg border bg-card p-4 text-sm shadow-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-4 text-primary" />
        Filtro aplicado
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.companyName ?? "Vista consolidada"}</span>
        <span>{context?.branchName ?? "Todas las sucursales"}</span>
        <span>Periodo: {period}</span>
      </div>
    </aside>
  );
}

function BusinessHealthSection() {
  return (
    <section className="executive-panel rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <LineChart className="size-4 text-primary" />
        Salud financiera y operativa por negocio
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {businessHealth.map((item) => (
          <article className="grid gap-3 rounded-lg border bg-background/80 p-3" key={item.business}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{item.business}</h3>
              <Badge variant="outline">Meta {item.target}%</Badge>
            </div>
            <HealthBar label="Salud financiera" value={item.financial} />
            <HealthBar label="Salud operativa" value={item.operational} />
            <HealthBar label="Avance meta" tone="muted" value={item.target} />
            <p className="text-xs leading-5 text-muted-foreground">{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ModuleInsights({ config }: { config: ModuleConfig }) {
  return (
    <section className="executive-panel rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="size-4 text-primary" />
        Insights y acciones sugeridas
      </div>
      <div className="grid gap-3">
        {config.insights.map((insight) => (
          <article
            className="insight-card grid gap-2 rounded-lg border bg-background p-3"
            key={insight.title}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={priorityClass(insight.priority)}>
                {insight.priority}
              </Badge>
              <h3 className="text-sm font-semibold">{insight.title}</h3>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {insight.detail}
            </p>
            <p className="text-sm font-medium">Accion: {insight.action}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ModuleRows({ config }: { config: ModuleConfig }) {
  return (
    <section className="executive-panel rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <ClipboardList className="size-4 text-primary" />
        Detalle operativo
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Concepto</th>
              <th className="py-2 pr-4 font-medium">Responsable</th>
              <th className="py-2 pr-4 font-medium">Resultado</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {config.rows.map((row) => (
              <tr className="border-b last:border-b-0" key={`${row.label}-${row.owner}`}>
                <td className="py-3 pr-4 font-medium">{row.label}</td>
                <td className="py-3 pr-4">{row.owner}</td>
                <td className="py-3 pr-4">{row.value}</td>
                <td className="py-3 pr-4 text-muted-foreground">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UsersAndPermissionsManager({
  context,
  enableDemoFixtures,
}: {
  context: StoredContext | null;
  enableDemoFixtures: boolean;
}) {
  const [activeRole, setActiveRole] = useState<RoleKey>("super_admin");
  const [users, setUsers] = useState<DemoManagedUser[]>(
    enableDemoFixtures ? initialDemoUsers : [],
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>("gerente_area");
  const [countryScope, setCountryScope] = useState(allCountryScope);
  const [businessScope, setBusinessScope] = useState(allBusinessScope);
  const [areaScope, setAreaScope] = useState(allAreaScope);
  const [branchScope, setBranchScope] = useState(allBranchScope);
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState("");

  const businessOptions = useMemo(
    () => [
      { label: allBusinessScope, value: allBusinessScope },
      ...demoCompanyOptions
        .filter((company) => !company.isConsolidated)
        .map((company) => ({ label: company.name, value: company.id })),
    ],
    [],
  );
  const countryOptions = useMemo(
    () => [
      { label: allCountryScope, value: allCountryScope },
      ...demoCountryOptions
        .filter((country) => country.scope !== "regional")
        .map((country) => ({ label: country.name, value: country.id })),
    ],
    [],
  );
  const areaOptions = useMemo(
    () => [
      { label: allAreaScope, value: allAreaScope },
      ...demoOperationalAreas
        .filter(
          (area) =>
            (countryScope === allCountryScope ||
              area.countryId === countryScope) &&
            (businessScope === allBusinessScope ||
              area.companyId === businessScope),
        )
        .map((area) => ({
          label: `${area.name} · ${getBusinessScopeLabel(area.companyId)}`,
          value: area.id,
        })),
    ],
    [businessScope, countryScope],
  );
  const branchOptions = useMemo(
    () => [
      { label: allBranchScope, value: allBranchScope },
      ...demoBranches
        .filter(
          (branch) =>
            (countryScope === allCountryScope ||
              branch.countryId === countryScope) &&
            (businessScope === allBusinessScope ||
              branch.companyId === businessScope) &&
            (areaScope === allAreaScope ||
              branch.operationalAreaId === areaScope),
        )
        .map((branch) => ({
          label: `${branch.name} · ${getBusinessScopeLabel(branch.companyId)}`,
          value: branch.id,
        })),
    ],
    [areaScope, businessScope, countryScope],
  );
  const selectedBranch = useMemo(
    () => demoBranches.find((branch) => branch.id === branchScope),
    [branchScope],
  );
  const selectedArea = useMemo(
    () => demoOperationalAreas.find((area) => area.id === areaScope),
    [areaScope],
  );
  const actorAreaScope =
    branchScope !== allBranchScope
      ? selectedBranch?.operationalAreaId ?? areaScope
      : areaScope;
  const actorBusinessScope =
    branchScope !== allBranchScope
      ? selectedBranch?.companyId ?? businessScope
      : areaScope !== allAreaScope
        ? selectedArea?.companyId ?? businessScope
        : businessScope;
  const actorCountryScope =
    branchScope !== allBranchScope
      ? selectedBranch?.countryId ?? countryScope
      : areaScope !== allAreaScope
        ? selectedArea?.countryId ?? countryScope
        : countryScope;
  const actor = useMemo(
    () =>
      buildDelegationActor(activeRole, {
        areaScope: actorAreaScope,
        branchScope,
        businessScope: actorBusinessScope,
        countryScope: actorCountryScope,
      }),
    [
      activeRole,
      actorAreaScope,
      actorBusinessScope,
      actorCountryScope,
      branchScope,
    ],
  );
  const creatableRoles = useMemo(
    () =>
      getCreatableRoles(activeRole, {
        canInviteOperationalUsers: activeRole === "gerente_sucursal",
      }),
    [activeRole],
  );
  const canCreateUsers = creatableRoles.length > 0;
  const canCreateBranchesForScope = canCreateBranch(
    actor,
    buildScopeBoundary({
      areaScope: actorAreaScope,
      branchScope: allBranchScope,
      businessScope: actorBusinessScope,
      countryScope: actorCountryScope,
    }),
  );
  const canCreateAreasForScope = canCreateOperationalArea(
    actor,
    buildScopeBoundary({
      areaScope: allAreaScope,
      branchScope: allBranchScope,
      businessScope: actorBusinessScope,
      countryScope: actorCountryScope,
    }),
  );

  useEffect(() => {
    setUsers(readDemoUsers(enableDemoFixtures));

    function refreshRole() {
      setActiveRole(readActiveDemoRole());
    }

    refreshRole();
    window.addEventListener("storage", refreshRole);
    window.addEventListener(roleChangeEvent, refreshRole);

    return () => {
      window.removeEventListener("storage", refreshRole);
      window.removeEventListener(roleChangeEvent, refreshRole);
    };
  }, [enableDemoFixtures]);

  useEffect(() => {
    if (context?.countryName) {
      setCountryScope(
        countryOptions.find((country) => country.label === context.countryName)
          ?.value ?? allCountryScope,
      );
    }

    if (context?.companyName) {
      setBusinessScope(
        businessOptions.find((business) => business.label === context.companyName)
          ?.value ?? allBusinessScope,
      );
    }

    if (context?.branchName) {
      setBranchScope(
        demoBranches.find((branch) => branch.name === context.branchName)?.id ??
          allBranchScope,
      );
    }
  }, [
    businessOptions,
    countryOptions,
    context?.branchName,
    context?.companyName,
    context?.countryName,
  ]);

  useEffect(() => {
    if (!creatableRoles.includes(roleKey)) {
      setRoleKey(getDefaultRoleForActor(activeRole));
    }
  }, [activeRole, creatableRoles, roleKey]);

  useEffect(() => {
    if (!areaOptions.some((area) => area.value === areaScope)) {
      setAreaScope(allAreaScope);
    }
  }, [areaOptions, areaScope]);

  useEffect(() => {
    if (!branchOptions.some((branch) => branch.value === branchScope)) {
      setBranchScope(allBranchScope);
    }
  }, [branchOptions, branchScope]);

  async function createDemoUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const roleRequiresArea =
      roleKey === "gerente_area" ||
      roleKey === "gerente_sucursal" ||
      roleKey === "usuario_operativo";
    const roleRequiresBranch =
      roleKey === "gerente_sucursal" || roleKey === "usuario_operativo";
    const targetAreaScope =
      roleKey === "gerente_area"
        ? areaScope
        : roleRequiresBranch
          ? selectedBranch?.operationalAreaId ?? areaScope
          : allAreaScope;
    const targetBranchScope = roleRequiresBranch ? branchScope : allBranchScope;
    const targetBusinessScope =
      isSuperAdministrator(roleKey) || roleKey === "ceo"
        ? allBusinessScope
        : roleRequiresBranch && selectedBranch
          ? selectedBranch.companyId
          : roleKey === "gerente_area" && selectedArea
            ? selectedArea.companyId
            : businessScope;
    const targetCountryScope =
      isSuperAdministrator(roleKey) || roleKey === "ceo"
        ? allCountryScope
        : roleRequiresBranch && selectedBranch
          ? selectedBranch.countryId
          : roleKey === "gerente_area" && selectedArea
            ? selectedArea.countryId
            : countryScope;

    if (roleRequiresArea && targetAreaScope === allAreaScope) {
      setMessage("Selecciona la gerencia de area antes de invitar este rol.");
      return;
    }

    if (roleRequiresBranch && targetBranchScope === allBranchScope) {
      setMessage("Selecciona la sucursal antes de invitar este rol.");
      return;
    }

    const targetScope = buildScopeBoundary({
      areaScope: targetAreaScope,
      branchScope: targetBranchScope,
      businessScope: targetBusinessScope,
      countryScope: targetCountryScope,
    });

    if (!canInviteUser(actor, { roleKey, scope: targetScope })) {
      setMessage(
        "Tu rol solo puede invitar usuarios de nivel inferior y dentro de tu alcance.",
      );
      return;
    }

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      setMessage("Completa nombre y correo para crear el usuario.");
      return;
    }

    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      setMessage("Ese correo ya existe en usuarios.");
      return;
    }

    setIsInviting(true);

    try {
      const response = await fetch("/api/users/invite", {
        body: JSON.stringify({
          email: normalizedEmail,
          fullName: normalizedName,
          roleKey,
          scope: targetScope,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const inviteResult = readInviteUserApiResponse(
        await response.json().catch(() => null),
      );

      if (!response.ok || !inviteResult.ok) {
        const missingConfig =
          inviteResult.missingConfig && inviteResult.missingConfig.length > 0
            ? ` Variables pendientes: ${inviteResult.missingConfig.join(", ")}.`
            : "";

        throw new Error(
          `${inviteResult.error ?? "No se pudo enviar la invitacion."}${missingConfig}`,
        );
      }

      const nextUsers: DemoManagedUser[] = [
        {
          id: inviteResult.invitationId ?? `demo-user-${Date.now()}`,
          fullName: normalizedName,
          email: normalizedEmail,
          organizationScope: "Grupo Analiza DEMO",
          countryScope: targetCountryScope,
          roleKey,
          businessScope: targetBusinessScope,
          areaScope: targetAreaScope,
          branchScope: targetBranchScope,
          invitationStatus: "Pendiente",
          status: "Pendiente invitacion",
          createdAt: todayIsoDate(),
        },
        ...users,
      ];

      setUsers(nextUsers);
      if (enableDemoFixtures) {
        persistDemoUsers(nextUsers);
      }
      setFullName("");
      setEmail("");
      setRoleKey(getDefaultRoleForActor(activeRole));
      setCountryScope(allCountryScope);
      setBusinessScope(allBusinessScope);
      setAreaScope(allAreaScope);
      setBranchScope(allBranchScope);
      setMessage(
        inviteResult.expiresAt
          ? `Invitacion enviada por correo. La cuenta queda pendiente hasta aceptar antes del ${inviteResult.expiresAt}.`
          : "Invitacion enviada por correo. La cuenta queda pendiente hasta aceptar.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la invitacion.",
      );
    } finally {
      setIsInviting(false);
    }
  }

  function updateUserRole(userId: string, nextRole: RoleKey) {
    const userToUpdate = users.find((user) => user.id === userId);

    if (!userToUpdate) {
      setMessage("No encontre el usuario DEMO seleccionado.");
      return;
    }

    const nextScope = buildScopeBoundary({
      areaScope: userToUpdate.areaScope,
      branchScope: userToUpdate.branchScope,
      businessScope: userToUpdate.businessScope,
      countryScope: userToUpdate.countryScope,
    });

    if (!canInviteUser(actor, { roleKey: nextRole, scope: nextScope })) {
      setMessage("No puedes asignar un rol igual, superior o fuera de tu alcance.");
      return;
    }

    const nextUsers = users.map((user) =>
      user.id === userId
        ? {
            ...user,
            roleKey: nextRole,
            businessScope:
              isSuperAdministrator(nextRole) || nextRole === "ceo"
                ? allBusinessScope
                : user.businessScope,
            areaScope:
              nextRole === "gerente_area"
                ? user.areaScope ?? allAreaScope
                : allAreaScope,
            branchScope:
              nextRole === "gerente_sucursal" ? user.branchScope : allBranchScope,
          }
        : user,
    );

    setUsers(nextUsers);
    if (enableDemoFixtures) {
      persistDemoUsers(nextUsers);
    }
    setMessage("Rol actualizado en usuarios DEMO.");
  }

  function deactivateDemoUser(userId: string) {
    const userToDeactivate = users.find((user) => user.id === userId);

    if (!userToDeactivate) {
      setMessage("No encontre el usuario DEMO seleccionado.");
      return;
    }

    const deactivationPlan = buildSoftDeactivationPlan({
      actor,
      subordinateCount:
        userToDeactivate.roleKey === "gerente_area" ||
        userToDeactivate.roleKey === "gerente_operaciones"
          ? 1
          : 0,
      target: {
        roleKey: userToDeactivate.roleKey,
        scope: buildScopeBoundary({
          areaScope: userToDeactivate.areaScope,
          branchScope: userToDeactivate.branchScope,
          businessScope: userToDeactivate.businessScope,
          countryScope: userToDeactivate.countryScope,
        }),
      },
      targetBranchCount:
        userToDeactivate.roleKey === "gerente_area" ||
        userToDeactivate.roleKey === "gerente_sucursal"
          ? 1
          : 0,
    });

    if (!deactivationPlan.canDeactivate) {
      setMessage("No puedes desactivar usuarios de nivel igual, superior o fuera de alcance.");
      return;
    }

    const nextUsers = users.map((user) =>
      user.id === userId
        ? {
            ...user,
            deactivatedAt: todayIsoDate(),
            reassignmentRequired: deactivationPlan.requiresReassignment,
            status: "Inactivo" as const,
          }
        : user,
    );

    setUsers(nextUsers);
    if (enableDemoFixtures) {
      persistDemoUsers(nextUsers);
    }
    setMessage(deactivationPlan.reason);
  }

  return (
    <section className="grid min-w-0 gap-5">
      <form
        className="grid min-w-0 gap-5 rounded-md border bg-card p-4"
        onSubmit={createDemoUser}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-lg font-semibold tracking-normal">
              <UserPlus className="size-5 text-primary" />
              Invitar usuario
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Crea usuarios por invitacion y define su alcance por pais, linea de
              negocio, gerencia de area y sucursal. El acceso no depende solo del
              rol.
            </p>
          </div>
          <Badge variant={canCreateUsers ? "outline" : "secondary"}>
            Actuando como {demoRoleProfiles[activeRole].label}
          </Badge>
        </div>

        {!canCreateUsers ? (
          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            Tu rol actual no tiene delegacion para invitar usuarios.
          </div>
        ) : null}

        <div className="grid gap-3 rounded-md border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground md:grid-cols-2">
          <span>
            <strong className="text-foreground">Roles disponibles:</strong>{" "}
            {creatableRoles.length > 0
              ? creatableRoles.map((role) => demoRoleProfiles[role].label).join(", ")
              : "ningun rol"}
          </span>
          <span>
            <strong className="text-foreground">Alcance operativo:</strong>{" "}
            Sucursales {canCreateBranchesForScope ? "puedes crear" : "solo lectura/asignadas"} ·
            Areas {canCreateAreasForScope ? "puedes crear" : "solo asignadas"}
          </span>
        </div>

        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
          <strong>Correo y contrasena:</strong> el sistema no manda contrasenas
          manuales. Envia una invitacion segura por correo y la cuenta queda
          pendiente hasta que la persona acepte el acceso.
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Nombre</span>
            <Input
              className="h-10"
              disabled={!canCreateUsers}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nombre del usuario"
              value={fullName}
            />
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Correo</span>
            <Input
              className="h-10"
              disabled={!canCreateUsers}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@analiza.com"
              type="email"
              value={email}
            />
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Rol</span>
            <select
              className={formSelectClassName}
              disabled={!canCreateUsers}
              onChange={(event) => setRoleKey(event.target.value as RoleKey)}
              value={roleKey}
            >
              {creatableRoles.map((role) => (
                <option key={role} value={role}>
                  {demoRoleProfiles[role].label}
                </option>
              ))}
            </select>
            <span className="text-xs leading-5 text-muted-foreground">
              {demoRoleProfiles[roleKey].accessSummary}
            </span>
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Pais</span>
            <select
              className={formSelectClassName}
              disabled={
                !canCreateUsers || isSuperAdministrator(roleKey) || roleKey === "ceo"
              }
              onChange={(event) => setCountryScope(event.target.value)}
              value={
                isSuperAdministrator(roleKey) || roleKey === "ceo"
                  ? allCountryScope
                  : countryScope
              }
            >
              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Linea de negocio</span>
            <select
              className={formSelectClassName}
              disabled={
                !canCreateUsers || isSuperAdministrator(roleKey) || roleKey === "ceo"
              }
              onChange={(event) => setBusinessScope(event.target.value)}
              value={
                isSuperAdministrator(roleKey) || roleKey === "ceo"
                  ? allBusinessScope
                  : businessScope
              }
            >
              {businessOptions.map((business) => (
                <option key={business.value} value={business.value}>
                  {business.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Gerencia de area</span>
            <select
              className={formSelectClassName}
              disabled={
                !canCreateUsers ||
                !["gerente_area", "gerente_sucursal", "usuario_operativo"].includes(
                  roleKey,
                )
              }
              onChange={(event) => setAreaScope(event.target.value)}
              value={
                ["gerente_area", "gerente_sucursal", "usuario_operativo"].includes(
                  roleKey,
                )
                  ? areaScope
                  : allAreaScope
              }
            >
              {areaOptions.map((area) => (
                <option key={area.value} value={area.value}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2 text-sm xl:col-span-2">
            <span className="font-medium">Sucursal</span>
            <select
              className={formSelectClassName}
              disabled={
                !canCreateUsers ||
                !["gerente_sucursal", "usuario_operativo"].includes(roleKey)
              }
              onChange={(event) => setBranchScope(event.target.value)}
              value={
                ["gerente_sucursal", "usuario_operativo"].includes(roleKey)
                  ? branchScope
                  : allBranchScope
              }
            >
              {branchOptions.map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branch.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          {message ? (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {message}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              La invitacion quedara pendiente hasta que el usuario la acepte.
            </span>
          )}

          <Button disabled={!canCreateUsers || isInviting} type="submit">
            <UserPlus className="size-4" />
            {isInviting ? "Enviando..." : "Enviar invitacion"}
          </Button>
        </div>
      </form>

      <section className="grid min-w-0 gap-4 rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <div className="flex items-center gap-2 text-lg font-semibold tracking-normal">
              <ClipboardList className="size-5 text-primary" />
              Invitaciones y usuarios
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Revisa estado, alcance asignado y acciones disponibles por usuario.
            </p>
          </div>
          <Badge variant="outline">{users.length} usuarios</Badge>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[1040px] table-fixed text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="w-[220px] py-2 pr-4 font-medium">Usuario</th>
                <th className="w-[190px] py-2 pr-4 font-medium">Rol</th>
                <th className="w-[140px] py-2 pr-4 font-medium">Pais</th>
                <th className="w-[170px] py-2 pr-4 font-medium">Linea</th>
                <th className="w-[190px] py-2 pr-4 font-medium">Gerencia</th>
                <th className="w-[180px] py-2 pr-4 font-medium">Sucursal</th>
                <th className="w-[150px] py-2 pr-4 font-medium">Estado</th>
                <th className="w-[120px] py-2 pr-4 font-medium">Accion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const roleOptions = Array.from(
                  new Set([user.roleKey, ...creatableRoles]),
                ).filter((role) => getRoleOptionsForValue(role).includes(role));
                const canDeactivate =
                  user.id !== "demo-admin" &&
                  user.status !== "Inactivo" &&
                  canInviteUser(actor, {
                    roleKey: user.roleKey,
                    scope: buildScopeBoundary({
                      areaScope: user.areaScope,
                      branchScope: user.branchScope,
                      businessScope: user.businessScope,
                      countryScope: user.countryScope,
                    }),
                  });

                return (
                  <tr className="border-b last:border-b-0" key={user.id}>
                    <td className="py-3 pr-4">
                      <div className="truncate font-medium">{user.fullName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        className={tableSelectClassName}
                        disabled={user.id === "demo-admin" || user.status === "Inactivo"}
                        onChange={(event) =>
                          updateUserRole(user.id, event.target.value as RoleKey)
                        }
                        value={user.roleKey}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {demoRoleProfiles[role].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {getCountryScopeLabel(user.countryScope ?? allCountryScope)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {getBusinessScopeLabel(user.businessScope)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {getAreaScopeLabel(user.areaScope)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {getBranchScopeLabel(user.branchScope)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <Badge variant="outline">{user.status}</Badge>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {user.invitationStatus
                          ? `Invitacion: ${user.invitationStatus}`
                          : user.createdAt}
                      </div>
                      {user.reassignmentRequired ? (
                        <div className="mt-1 text-xs text-amber-700">
                          Reasignacion requerida
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <Button
                        disabled={!canDeactivate}
                        onClick={() => deactivateDemoUser(user.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Desactivar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export function BusinessModuleDashboard({
  enableDemoFixtures = true,
  module,
}: BusinessModuleDashboardProps) {
  const [context, setContext] = useState<StoredContext | null>(null);
  const config = moduleConfigs[module];

  useEffect(() => {
    function refreshContext() {
      setContext(readStoredContext());
    }

    refreshContext();
    window.addEventListener("storage", refreshContext);
    window.addEventListener(contextChangeEvent, refreshContext);

    return () => {
      window.removeEventListener("storage", refreshContext);
      window.removeEventListener(contextChangeEvent, refreshContext);
    };
  }, []);

  const scopeText = useMemo(() => {
    const company = context?.companyName ?? "Vista consolidada";
    const branch = context?.branchName ?? "Todas las sucursales";
    return `${company} / ${branch}`;
  }, [context?.branchName, context?.companyName]);

  if (!config) {
    return null;
  }

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="executive-panel grid gap-4 rounded-lg border p-5 xl:grid-cols-[1fr_360px] xl:items-end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              Entorno DEMO
            </Badge>
            <Badge variant="outline">{config.audience}</Badge>
          </div>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              {config.title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {config.description}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Vista actual: {scopeText}. Cambia negocio, sucursal o fechas en el
              selector superior para recalcular este panel.
            </p>
          </div>
        </div>
        <ScopeCard context={context} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {(module === "operacion" || module === "finanzas") && (
        <BusinessHealthSection />
      )}

      {module === "usuarios-permisos" ? (
        <UsersAndPermissionsManager
          context={context}
          enableDemoFixtures={enableDemoFixtures}
        />
      ) : null}

      {config.explanation && module !== "usuarios-permisos" ? (
        <section className="executive-panel rounded-lg border p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="size-4 text-primary" />
            Que significa
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {config.explanation}
          </p>
        </section>
      ) : null}

      {module !== "usuarios-permisos" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <ModuleInsights config={config} />
          <ModuleRows config={config} />
        </div>
      ) : null}
    </section>
  );
}

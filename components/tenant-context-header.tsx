"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Globe2,
  LockKeyhole,
  MapPin,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";

import {
  demoBranches,
  demoBusinessLineOptions,
  demoCompanyOptions,
  demoCountryOptions,
  getBusinessLineForCompany,
  getCompanyForBusinessLine,
  getDefaultPeriod,
} from "@/lib/tenant/demo-context";
import {
  fetchCurrentUserAccess,
  isBranchManagerScopedAccess,
  type CurrentUserAccess,
} from "@/lib/tenant/current-user-access";

const allBranchesValue = "__all__";
const allManagersValue = "__all_managers__";
const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";

const managerOptions = [
  { id: allManagersValue, name: "Todos los gerentes" },
  { id: "manager-operations-lab", name: "Gerencia operaciones Laboratorio" },
  { id: "manager-operations-physio", name: "Gerencia operaciones Fisioterapia" },
  { id: "manager-operations-img", name: "Gerencia operaciones Imagenes" },
  { id: "manager-branch-sv", name: "Gerentes sucursales SV" },
];

type StoredContext = {
  countryId: string;
  countryName: string;
  companyId: string;
  companyName: string;
  businessLineId: string;
  businessLineName: string;
  businessLineCode: string;
  branchId: string;
  branchName: string;
  managerId: string;
  managerName: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  year: string;
  month: string;
  isDemo: boolean;
};

function getInitialCountryId() {
  return demoCountryOptions[0]?.id ?? "";
}

function readStoredContext() {
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

function formatPeriodLabel(periodStart: string, periodEnd: string) {
  if (periodStart.slice(0, 7) === periodEnd.slice(0, 7)) {
    return new Intl.DateTimeFormat("es-SV", {
      month: "short",
      year: "numeric",
    })
      .format(new Date(`${periodStart}T00:00:00`))
      .replace(".", "");
  }

  return `${periodStart} a ${periodEnd}`;
}

function findBusinessLineByCompanyScope(companyId?: string | null, companyName?: string | null) {
  const lineByCompanyId = companyId ? getBusinessLineForCompany(companyId) : null;

  if (lineByCompanyId && !lineByCompanyId.isConsolidated) {
    return lineByCompanyId;
  }

  const normalizedCompanyName = companyName?.toLowerCase() ?? "";

  if (normalizedCompanyName.includes("laboratorio")) {
    return (
      demoBusinessLineOptions.find((line) => line.code === "LABORATORY") ??
      demoBusinessLineOptions[0]
    );
  }

  if (normalizedCompanyName.includes("fisioterapia")) {
    return (
      demoBusinessLineOptions.find((line) => line.code === "PHYSIOTHERAPY") ??
      demoBusinessLineOptions[0]
    );
  }

  if (
    normalizedCompanyName.includes("imagen") ||
    normalizedCompanyName.includes("image")
  ) {
    return (
      demoBusinessLineOptions.find((line) => line.code === "IMAGING") ??
      demoBusinessLineOptions[0]
    );
  }

  return demoBusinessLineOptions[0];
}

export function TenantContextHeader() {
  const [currentUserAccess, setCurrentUserAccess] =
    useState<CurrentUserAccess | null>(null);
  const [countryId, setCountryId] = useState(getInitialCountryId());
  const [companyId, setCompanyId] = useState("");
  const [businessLineId, setBusinessLineId] = useState(
    demoBusinessLineOptions[0]?.id ?? "",
  );
  const [branchId, setBranchId] = useState(allBranchesValue);
  const [managerId, setManagerId] = useState(allManagersValue);
  const [periodStart, setPeriodStart] = useState(`${getDefaultPeriod()}-01`);
  const [periodEnd, setPeriodEnd] = useState(`${getDefaultPeriod()}-31`);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const scopedBranchAccess = isBranchManagerScopedAccess(currentUserAccess)
    ? currentUserAccess
    : null;
  const scopedBusinessLine = scopedBranchAccess
    ? findBusinessLineByCompanyScope(
        scopedBranchAccess.scope.companyId,
        scopedBranchAccess.scope.companyName,
      )
    : null;
  const selectedCountry = demoCountryOptions.find(
    (country) => country.id === countryId,
  );
  const selectedCompany = demoCompanyOptions.find(
    (company) => company.id === companyId,
  );
  const selectedManager =
    managerOptions.find((manager) => manager.id === managerId) ??
    managerOptions[0];

  const countryBranches = useMemo(
    () =>
      selectedCountry?.scope === "regional"
        ? demoBranches
        : demoBranches.filter((branch) => branch.countryId === countryId),
    [countryId, selectedCountry?.scope],
  );

  const companies = useMemo(() => demoCompanyOptions, []);

  const branches = useMemo(
    () =>
      selectedCompany?.isConsolidated
        ? countryBranches
        : countryBranches.filter((branch) => branch.companyId === companyId),
    [companyId, countryBranches, selectedCompany?.isConsolidated],
  );

  useEffect(() => {
    let isMounted = true;

    fetchCurrentUserAccess().then((access) => {
      if (isMounted) {
        setCurrentUserAccess(access);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const storedContext = readStoredContext();

    const nextCountryId =
      searchParams.get("country") ?? storedContext?.countryId;
    const nextCompanyId =
      searchParams.get("company") ?? storedContext?.companyId;
    const nextBusinessLineId =
      searchParams.get("line") ?? storedContext?.businessLineId;
    const nextBranchId = searchParams.get("branch") ?? storedContext?.branchId;
    const nextManagerId =
      searchParams.get("manager") ?? storedContext?.managerId;
    const nextPeriodStart =
      searchParams.get("from") ?? storedContext?.periodStart;
    const nextPeriodEnd = searchParams.get("to") ?? storedContext?.periodEnd;

    if (nextCountryId) {
      setCountryId(nextCountryId);
    }

    if (nextCompanyId) {
      setCompanyId(nextCompanyId);
    }

    if (nextBusinessLineId) {
      setBusinessLineId(nextBusinessLineId);
      setCompanyId(getCompanyForBusinessLine(nextBusinessLineId).id);
    }

    if (nextBranchId) {
      setBranchId(nextBranchId);
    }

    if (nextManagerId) {
      setManagerId(nextManagerId);
    }

    if (nextPeriodStart) {
      setPeriodStart(nextPeriodStart);
    }

    if (nextPeriodEnd) {
      setPeriodEnd(nextPeriodEnd);
    }
  }, []);

  useEffect(() => {
    if (scopedBranchAccess) {
      return;
    }

    const nextCompanyId = companies[0]?.id ?? "";
    setCompanyId((currentCompanyId) =>
      companies.some((company) => company.id === currentCompanyId)
        ? currentCompanyId
        : nextCompanyId,
    );
  }, [companies, scopedBranchAccess]);

  useEffect(() => {
    if (scopedBranchAccess) {
      return;
    }

    setBranchId((currentBranchId) =>
      currentBranchId === allBranchesValue ||
      branches.some((branch) => branch.id === currentBranchId)
        ? currentBranchId
        : allBranchesValue,
    );
  }, [branches, scopedBranchAccess]);

  useEffect(() => {
    if (!scopedBranchAccess) {
      return;
    }

    setAdvancedFiltersOpen(false);
    setBusinessLineId(scopedBusinessLine?.id ?? demoBusinessLineOptions[0]?.id ?? "");
    setCompanyId(scopedBranchAccess.scope.companyId ?? scopedBusinessLine?.companyId ?? "");
    setCountryId(scopedBranchAccess.scope.countryId ?? getInitialCountryId());
    setBranchId(scopedBranchAccess.scope.branchId ?? scopedBranchAccess.scope.branchName);
    setManagerId(allManagersValue);
  }, [
    scopedBranchAccess,
    scopedBusinessLine?.companyId,
    scopedBusinessLine?.id,
  ]);

  useEffect(() => {
    const country = demoCountryOptions.find((item) => item.id === countryId);
    const company = demoCompanyOptions.find((item) => item.id === companyId);
    const businessLine =
      scopedBusinessLine ??
      demoBusinessLineOptions.find((item) => item.id === businessLineId);
    const branch = demoBranches.find((item) => item.id === branchId);

    if (!businessLine) {
      return;
    }

    const branchName =
      scopedBranchAccess?.scope.branchName ??
      branch?.name ??
      (country?.scope === "regional"
        ? "Todas las sucursales de la region"
        : "Todas las sucursales permitidas");
    const contextBranchId =
      scopedBranchAccess?.scope.branchId ??
      scopedBranchAccess?.scope.branchName ??
      branchId;
    const contextCountryId =
      scopedBranchAccess?.scope.countryId ?? country?.id ?? getInitialCountryId();
    const contextCompanyId =
      scopedBranchAccess?.scope.companyId ?? company?.id ?? "";
    const context: StoredContext = {
      countryId: contextCountryId,
      countryName: scopedBranchAccess?.scope.countryName ?? country?.name ?? "Pais asignado",
      companyId: contextCompanyId,
      companyName:
        scopedBranchAccess?.scope.companyName ??
        company?.name ??
        businessLine.name,
      businessLineId: businessLine.id,
      businessLineName: businessLine.name,
      businessLineCode: businessLine.code,
      branchId: contextBranchId,
      branchName,
      managerId: scopedBranchAccess ? allManagersValue : managerId,
      managerName: scopedBranchAccess
        ? scopedBranchAccess.scope.branchName
        : selectedManager.name,
      period: `${periodStart} a ${periodEnd}`,
      periodStart,
      periodEnd,
      year: periodStart.slice(0, 4),
      month: periodStart.slice(5, 7),
      isDemo: !scopedBranchAccess,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(context));
    window.sessionStorage.setItem(storageKey, JSON.stringify(context));

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("country", contextCountryId);
    searchParams.set("company", contextCompanyId);
    searchParams.set("line", businessLine.id);
    searchParams.set("branch", contextBranchId);
    searchParams.set("from", periodStart);
    searchParams.set("to", periodEnd);
    searchParams.set("manager", scopedBranchAccess ? allManagersValue : managerId);
    searchParams.delete("channel");
    searchParams.delete("payer");
    searchParams.delete("service");
    searchParams.delete("professional");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${searchParams.toString()}`,
    );
    window.dispatchEvent(new Event(contextChangeEvent));
  }, [
    branchId,
    businessLineId,
    companyId,
    countryId,
    managerId,
    periodEnd,
    periodStart,
    scopedBranchAccess,
    scopedBusinessLine,
    selectedManager.name,
  ]);

  function handleBusinessLineChange(nextBusinessLineId: string) {
    const nextCompany = getCompanyForBusinessLine(nextBusinessLineId);
    setBusinessLineId(nextBusinessLineId);
    setCompanyId(nextCompany.id);
    setBranchId(allBranchesValue);
  }

  const selectedBranch = demoBranches.find((item) => item.id === branchId);
  const branchName =
    scopedBranchAccess?.scope.branchName ??
    selectedBranch?.name ??
    (selectedCountry?.scope === "regional"
      ? "Todas las sucursales de la region"
      : "Todas las sucursales");
  const periodLabel = formatPeriodLabel(periodStart, periodEnd);
  const lineLabel =
    scopedBusinessLine?.name ??
    demoBusinessLineOptions.find((line) => line.id === businessLineId)?.name ??
    "Linea asignada";
  const companyLabel =
    scopedBranchAccess?.scope.companyName ??
    selectedCompany?.name ??
    lineLabel;
  const countryLabel =
    scopedBranchAccess?.scope.countryName ??
    selectedCountry?.name ??
    "Pais asignado";

  if (scopedBranchAccess) {
    return (
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="flex min-w-0 flex-col gap-2 2xl:flex-row 2xl:items-center">
          <div className="flex min-h-12 min-w-0 items-center gap-3 rounded-md border-2 border-primary/50 bg-accent px-3 py-2 text-xs shadow-sm 2xl:min-w-[310px]">
            <BriefcaseBusiness className="size-4 shrink-0 text-primary" />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="font-semibold uppercase text-primary">
                Linea asignada
              </span>
              <span className="truncate text-base font-semibold text-accent-foreground">
                {lineLabel}
              </span>
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 rounded-md border bg-background p-2">
            <div className="flex h-9 min-w-44 items-center gap-2 rounded-md border bg-muted/40 px-2 text-xs">
              <LockKeyhole className="size-3.5 shrink-0 text-primary" />
              <span className="font-medium">Acceso de sucursal</span>
            </div>
            <div className="min-w-0 flex-1 truncate px-1 text-sm">
              <span className="font-medium">{branchName}</span>
              <span className="text-muted-foreground"> · {companyLabel}</span>
              <span className="text-muted-foreground"> · {countryLabel}</span>
              <span className="text-muted-foreground"> · {periodLabel}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 flex-1 gap-2">
      <div className="flex min-w-0 flex-col gap-2 2xl:flex-row 2xl:items-center">
        <label className="flex min-h-12 min-w-0 items-center gap-3 rounded-md border-2 border-primary/50 bg-accent px-3 py-2 text-xs shadow-sm 2xl:min-w-[310px]">
          <BriefcaseBusiness className="size-4 shrink-0 text-primary" />
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="font-semibold uppercase text-primary">
              Linea activa
            </span>
            <select
              aria-label="Linea de negocio activa"
              className="min-w-0 bg-transparent text-base font-semibold text-accent-foreground outline-none"
              value={businessLineId}
              onChange={(event) => handleBusinessLineChange(event.target.value)}
            >
              {demoBusinessLineOptions.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </select>
          </span>
        </label>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-md border bg-background p-2">
          <label className="flex h-9 min-w-44 items-center gap-2 rounded-md border bg-muted/40 px-2 text-xs">
            <Globe2 className="size-3.5 shrink-0 text-muted-foreground" />
            <select
              aria-label="Pais o region"
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={countryId}
              onChange={(event) => setCountryId(event.target.value)}
            >
              {demoCountryOptions.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <div className="min-w-0 flex-1 truncate px-1 text-sm">
            <span className="font-medium">
              {selectedCompany?.name ?? "Vista consolidada"}
            </span>
            <span className="text-muted-foreground"> · {branchName}</span>
            <span className="text-muted-foreground"> · {periodLabel}</span>
          </div>

          <button
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            onClick={() => setAdvancedFiltersOpen((isOpen) => !isOpen)}
            type="button"
          >
            <SlidersHorizontal className="size-3.5" />
            Filtros
          </button>

          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {selectedManager.name} · DEMO
          </span>
        </div>
      </div>

      {advancedFiltersOpen ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border bg-background p-2">
          <div className="px-2 text-xs font-semibold text-muted-foreground">
            Filtros avanzados
          </div>
          <label className="flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-2 text-xs">
            <MapPin className="size-3.5 text-muted-foreground" />
            <select
              className="min-w-44 bg-transparent outline-none"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value={allBranchesValue}>
                {selectedCountry?.scope === "regional"
                  ? "Todas las sucursales de la region"
                  : "Todas las sucursales"}
              </option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-2 text-xs">
            <UsersRound className="size-3.5 text-muted-foreground" />
            <select
              className="min-w-40 bg-transparent outline-none"
              value={managerId}
              onChange={(event) => setManagerId(event.target.value)}
            >
              {managerOptions.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-2 text-xs">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <input
              aria-label="Fecha desde"
              className="w-28 bg-transparent outline-none"
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
            />
          </label>

          <label className="flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-2 text-xs">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <input
              aria-label="Fecha hasta"
              className="w-28 bg-transparent outline-none"
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

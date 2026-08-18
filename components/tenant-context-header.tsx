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
  demoOperationalAreas,
  getBusinessLineForCompany,
  getCompanyForBusinessLine,
  getDefaultPeriod,
  consolidatedCompanyId,
} from "@/lib/tenant/demo-context";
import {
  allBranchesValue,
  allChannelsValue,
  allManagersValue,
  allOperationalAreasValue,
  allPayersValue,
  allProfessionalsValue,
  allServicesValue,
  createGlobalFilterContextFromSearchParams,
  demoChannelOptions,
  demoManagerOptions as managerOptions,
  demoPayerOptions,
  demoProfessionalOptions,
  demoServiceOptions,
  globalContextChangeEvent as contextChangeEvent,
  globalContextStorageKey as storageKey,
  resolveGlobalFilterContext,
  toGlobalFilterSearchParams,
  type GlobalFilterInput,
} from "@/lib/analytics/global-filters";
import {
  fetchCurrentUserAccess,
  isBranchManagerScopedAccess,
  type CurrentUserAccess,
} from "@/lib/tenant/current-user-access";

const demoBusinessLineStorageKey = "analiza:demo-business-line";
const roleChangeEvent = "analiza:role-change";

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
  operationalAreaId?: string;
  operationalAreaName?: string;
  managerId: string;
  managerName: string;
  professionalId?: string;
  professionalName?: string;
  serviceId?: string;
  serviceName?: string;
  payerId?: string;
  payerName?: string;
  channelId?: string;
  channelName?: string;
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
    return JSON.parse(rawContext) as StoredContext & GlobalFilterInput;
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

type TenantContextHeaderProps = {
  isDemoEnvironment: boolean;
};

export function TenantContextHeader({
  isDemoEnvironment,
}: TenantContextHeaderProps) {
  const [currentUserAccess, setCurrentUserAccess] =
    useState<CurrentUserAccess | null>(null);
  const [demoBusinessLineCode, setDemoBusinessLineCode] = useState<string | null>(
    null,
  );
  const [countryId, setCountryId] = useState(getInitialCountryId());
  const [companyId, setCompanyId] = useState("");
  const [businessLineId, setBusinessLineId] = useState(
    demoBusinessLineOptions[0]?.id ?? "",
  );
  const [branchId, setBranchId] = useState(allBranchesValue);
  const [operationalAreaId, setOperationalAreaId] = useState(
    allOperationalAreasValue,
  );
  const [managerId, setManagerId] = useState(allManagersValue);
  const [professionalId, setProfessionalId] = useState(allProfessionalsValue);
  const [serviceId, setServiceId] = useState(allServicesValue);
  const [payerId, setPayerId] = useState(allPayersValue);
  const [channelId, setChannelId] = useState(allChannelsValue);
  const [periodStart, setPeriodStart] = useState(`${getDefaultPeriod()}-01`);
  const [periodEnd, setPeriodEnd] = useState(`${getDefaultPeriod()}-31`);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const scopedBranchAccess = isBranchManagerScopedAccess(currentUserAccess)
    ? currentUserAccess
    : null;
  const scopedCompanyAccess = currentUserAccess?.scope.companyId
    ? currentUserAccess
    : null;
  const scopedAreaAccess =
    scopedCompanyAccess?.scope.operationalAreaId && !scopedBranchAccess
      ? scopedCompanyAccess
      : null;
  const scopedBusinessLine = scopedCompanyAccess
    ? findBusinessLineByCompanyScope(
        scopedCompanyAccess.scope.companyId,
        scopedCompanyAccess.scope.companyName,
      )
    : null;
  const demoScopedBusinessLine =
    isDemoEnvironment && demoBusinessLineCode && !scopedCompanyAccess
      ? demoBusinessLineOptions.find(
          (line) =>
            line.code === demoBusinessLineCode && !line.isConsolidated,
        ) ?? null
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
  const selectedProfessional =
    demoProfessionalOptions.find((professional) => professional.id === professionalId) ??
    demoProfessionalOptions[0];
  const selectedService =
    demoServiceOptions.find((service) => service.id === serviceId) ??
    demoServiceOptions[0];
  const selectedPayer =
    demoPayerOptions.find((payer) => payer.id === payerId) ??
    demoPayerOptions[0];
  const selectedChannel =
    demoChannelOptions.find((channel) => channel.id === channelId) ??
    demoChannelOptions[0];

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

  const operationalAreas = useMemo(
    () =>
      demoOperationalAreas.filter(
        (area) =>
          (selectedCountry?.scope === "regional" || area.countryId === countryId) &&
          (selectedCompany?.isConsolidated || area.companyId === companyId),
      ),
    [
      companyId,
      countryId,
      selectedCompany?.isConsolidated,
      selectedCountry?.scope,
    ],
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
    function syncDemoBusinessLine() {
      if (!isDemoEnvironment) {
        setDemoBusinessLineCode(null);
        return;
      }

      setDemoBusinessLineCode(
        window.localStorage.getItem(demoBusinessLineStorageKey) ??
          window.sessionStorage.getItem(demoBusinessLineStorageKey),
      );
    }

    syncDemoBusinessLine();
    window.addEventListener("storage", syncDemoBusinessLine);
    window.addEventListener(roleChangeEvent, syncDemoBusinessLine);

    return () => {
      window.removeEventListener("storage", syncDemoBusinessLine);
      window.removeEventListener(roleChangeEvent, syncDemoBusinessLine);
    };
  }, [isDemoEnvironment]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const storedContext = isDemoEnvironment ? readStoredContext() : null;
    const nextContext = createGlobalFilterContextFromSearchParams(
      searchParams,
      storedContext,
    );

    setCountryId(nextContext.countryId);
    setCompanyId(nextContext.companyId);
    setBusinessLineId(nextContext.businessLineId);
    setBranchId(nextContext.branchId);
    setOperationalAreaId(nextContext.operationalAreaId);
    setManagerId(nextContext.managerId);
    setProfessionalId(nextContext.professionalId);
    setServiceId(nextContext.serviceId);
    setPayerId(nextContext.payerId);
    setChannelId(nextContext.channelId);
    setPeriodStart(nextContext.periodStart);
    setPeriodEnd(nextContext.periodEnd);
  }, [isDemoEnvironment]);

  useEffect(() => {
    if (scopedCompanyAccess) {
      return;
    }

    const nextCompanyId = companies[0]?.id ?? "";
    setCompanyId((currentCompanyId) =>
      companies.some((company) => company.id === currentCompanyId)
        ? currentCompanyId
        : nextCompanyId,
    );
  }, [companies, scopedCompanyAccess]);

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
    if (scopedBranchAccess) {
      return;
    }

    setOperationalAreaId((currentOperationalAreaId) =>
      currentOperationalAreaId === allOperationalAreasValue ||
      operationalAreas.some((area) => area.id === currentOperationalAreaId)
        ? currentOperationalAreaId
        : allOperationalAreasValue,
    );
  }, [operationalAreas, scopedBranchAccess]);

  useEffect(() => {
    if (!scopedBranchAccess) {
      return;
    }

    setAdvancedFiltersOpen(false);
    setBusinessLineId(scopedBusinessLine?.id ?? demoBusinessLineOptions[0]?.id ?? "");
    setCompanyId(scopedBranchAccess.scope.companyId ?? scopedBusinessLine?.companyId ?? "");
    setCountryId(scopedBranchAccess.scope.countryId ?? getInitialCountryId());
    setBranchId(scopedBranchAccess.scope.branchId ?? scopedBranchAccess.scope.branchName);
    setOperationalAreaId(allOperationalAreasValue);
    setManagerId(allManagersValue);
    setProfessionalId(allProfessionalsValue);
    setServiceId(allServicesValue);
    setPayerId(allPayersValue);
    setChannelId(allChannelsValue);
  }, [
    scopedBranchAccess,
    scopedBusinessLine?.companyId,
    scopedBusinessLine?.id,
  ]);

  useEffect(() => {
    if (!scopedCompanyAccess || scopedBranchAccess) {
      return;
    }

    setBusinessLineId(scopedBusinessLine?.id ?? demoBusinessLineOptions[0]?.id ?? "");
    setCompanyId(scopedCompanyAccess.scope.companyId ?? scopedBusinessLine?.companyId ?? "");
    setCountryId(scopedCompanyAccess.scope.countryId ?? getInitialCountryId());
    setOperationalAreaId(
      scopedAreaAccess?.scope.operationalAreaId ?? allOperationalAreasValue,
    );
    setBranchId(allBranchesValue);
  }, [
    scopedAreaAccess?.scope.operationalAreaId,
    scopedBranchAccess,
    scopedBusinessLine?.companyId,
    scopedBusinessLine?.id,
    scopedCompanyAccess,
  ]);

  useEffect(() => {
    if (scopedBranchAccess || !demoScopedBusinessLine) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has("line")) {
      return;
    }

    setBusinessLineId((currentBusinessLineId) => {
      const currentBusinessLine = demoBusinessLineOptions.find(
        (line) => line.id === currentBusinessLineId,
      );

      return !currentBusinessLine || currentBusinessLine.isConsolidated
        ? demoScopedBusinessLine.id
        : currentBusinessLineId;
    });
    setCompanyId((currentCompanyId) => {
      const currentCompany = demoCompanyOptions.find(
        (company) => company.id === currentCompanyId,
      );
      const demoCompany = getCompanyForBusinessLine(demoScopedBusinessLine.id);

      return !currentCompany || currentCompany.isConsolidated
        ? demoCompany.id
        : currentCompanyId;
    });
  }, [demoScopedBusinessLine, scopedBranchAccess]);

  useEffect(() => {
    const country = demoCountryOptions.find((item) => item.id === countryId);
    const company = demoCompanyOptions.find((item) => item.id === companyId);
    const businessLine =
      scopedBusinessLine ??
      demoBusinessLineOptions.find((item) => item.id === businessLineId);
    const businessLineCompany =
      isDemoEnvironment && businessLine?.companyId
        ? demoCompanyOptions.find((item) => item.id === businessLine.companyId)
        : company;
    const branch = demoBranches.find((item) => item.id === branchId);
    const operationalArea = demoOperationalAreas.find(
      (item) => item.id === operationalAreaId,
    );

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
      scopedCompanyAccess?.scope.countryId ?? country?.id ?? getInitialCountryId();
    const contextCompanyId =
      scopedCompanyAccess?.scope.companyId ??
      (isDemoEnvironment ? businessLineCompany?.id ?? "" : consolidatedCompanyId);
    const context = resolveGlobalFilterContext({
      branchId: contextBranchId,
      branchName,
      businessLineCode: businessLine.code,
      businessLineId: businessLine.id,
      businessLineName: businessLine.name,
      companyId: contextCompanyId,
      companyName:
        scopedCompanyAccess?.scope.companyName ??
        (isDemoEnvironment
          ? businessLineCompany?.name ?? businessLine.name
          : "Vista consolidada"),
      countryId: contextCountryId,
      countryName:
        scopedCompanyAccess?.scope.countryName ?? country?.name ?? "Pais asignado",
      dateFrom: periodStart,
      dateTo: periodEnd,
      isDemo: isDemoEnvironment,
      managerId: scopedBranchAccess ? allManagersValue : managerId,
      managerName: scopedBranchAccess
        ? scopedBranchAccess.scope.branchName
        : selectedManager.name,
      operationalAreaId: scopedBranchAccess
        ? allOperationalAreasValue
        : scopedAreaAccess?.scope.operationalAreaId ?? operationalAreaId,
      operationalAreaName: scopedBranchAccess
        ? undefined
        : scopedAreaAccess?.scope.operationalAreaName ?? operationalArea?.name,
      payerId,
      periodStart,
      periodEnd,
      professionalId,
      serviceId,
      channelId,
    });

    window.localStorage.setItem(storageKey, JSON.stringify(context));
    window.sessionStorage.setItem(storageKey, JSON.stringify(context));

    const searchParams = toGlobalFilterSearchParams(context);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${searchParams.toString()}`,
    );
    window.dispatchEvent(new Event(contextChangeEvent));
  }, [
    branchId,
    businessLineId,
    channelId,
    companyId,
    countryId,
    managerId,
    operationalAreaId,
    payerId,
    periodEnd,
    periodStart,
    professionalId,
    currentUserAccess,
    scopedBranchAccess,
    scopedBusinessLine,
    scopedAreaAccess,
    scopedCompanyAccess,
    isDemoEnvironment,
    selectedManager.name,
    serviceId,
  ]);

  function handleBusinessLineChange(nextBusinessLineId: string) {
    const nextCompanyId = isDemoEnvironment
      ? getCompanyForBusinessLine(nextBusinessLineId).id
      : scopedCompanyAccess?.scope.companyId ?? consolidatedCompanyId;

    function syncLineSearchParams() {
      const searchParams = new URLSearchParams(window.location.search);

      searchParams.set("line", nextBusinessLineId);
      searchParams.set("company", nextCompanyId);
      searchParams.set("branch", allBranchesValue);
      searchParams.set("area", allOperationalAreasValue);
      searchParams.set("manager", allManagersValue);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${searchParams.toString()}`,
      );
    }

    setBusinessLineId(nextBusinessLineId);
    setCompanyId(nextCompanyId);
    setBranchId(allBranchesValue);
    setOperationalAreaId(allOperationalAreasValue);
    setManagerId(allManagersValue);
    syncLineSearchParams();
    window.setTimeout(syncLineSearchParams, 0);
    window.setTimeout(syncLineSearchParams, 250);
  }

  const selectedBranch = demoBranches.find((item) => item.id === branchId);
  const selectedOperationalArea = demoOperationalAreas.find(
    (item) => item.id === operationalAreaId,
  );
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
    scopedCompanyAccess?.scope.companyName ??
    selectedCompany?.name ??
    lineLabel;
  const countryLabel =
    scopedCompanyAccess?.scope.countryName ??
    selectedCountry?.name ??
    "Pais asignado";
  const areaLabel =
    scopedAreaAccess?.scope.operationalAreaName ??
    selectedOperationalArea?.name ??
    "Todas las areas";
  const isLineLocked = Boolean(scopedCompanyAccess);

  if (scopedBranchAccess) {
    return (
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="flex min-w-0 flex-col gap-2 2xl:flex-row 2xl:items-center">
          <div className="flex min-h-12 min-w-0 items-center gap-3 rounded-lg border-2 border-primary/50 bg-accent/90 px-3 py-2 text-xs shadow-sm 2xl:min-w-[310px]">
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

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-background/90 p-2 shadow-sm">
            <div className="flex h-9 min-w-44 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
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
        <label className="flex min-h-12 min-w-0 items-center gap-3 rounded-lg border-2 border-primary/50 bg-accent/90 px-3 py-2 text-xs shadow-sm 2xl:min-w-[310px]">
          <BriefcaseBusiness className="size-4 shrink-0 text-primary" />
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="font-semibold uppercase text-primary">
              {isLineLocked ? "Linea asignada" : "Linea activa"}
            </span>
            {isLineLocked ? (
              <span className="truncate text-base font-semibold text-accent-foreground">
                {lineLabel}
              </span>
            ) : (
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
            )}
          </span>
        </label>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-background/90 p-2 shadow-sm">
          <label className="flex h-9 min-w-44 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <Globe2 className="size-3.5 shrink-0 text-muted-foreground" />
            <select
              aria-label="Pais o region"
              className="min-w-0 flex-1 bg-transparent outline-none"
              disabled={Boolean(scopedCompanyAccess?.scope.countryId)}
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
            <span className="text-muted-foreground"> · {areaLabel}</span>
            <span className="text-muted-foreground"> · {periodLabel}</span>
          </div>

          <button
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-background px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
            onClick={() => setAdvancedFiltersOpen((isOpen) => !isOpen)}
            type="button"
          >
            <SlidersHorizontal className="size-3.5" />
            Filtros
          </button>

          <span
            className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            title={`${selectedProfessional.name} · ${selectedPayer.name} · ${selectedChannel.name}`}
          >
            {selectedManager.name} · {selectedService.name} ·{" "}
            {isDemoEnvironment ? "DEMO" : "Oficial"}
          </span>
        </div>
      </div>

      {advancedFiltersOpen ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-background/95 p-2 shadow-sm">
          <div className="px-2 text-xs font-semibold text-muted-foreground">
            Filtros avanzados
          </div>
          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Area operativa"
              className="min-w-48 bg-transparent outline-none"
              value={operationalAreaId}
              onChange={(event) => setOperationalAreaId(event.target.value)}
            >
              <option value={allOperationalAreasValue}>Todas las areas</option>
              {operationalAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <MapPin className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Sucursal"
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

          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <UsersRound className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Gerente"
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

          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <UsersRound className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Profesional"
              className="min-w-44 bg-transparent outline-none"
              value={professionalId}
              onChange={(event) => setProfessionalId(event.target.value)}
            >
              {demoProfessionalOptions.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Servicio"
              className="min-w-44 bg-transparent outline-none"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
            >
              {demoServiceOptions.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Pagador"
              className="min-w-40 bg-transparent outline-none"
              value={payerId}
              onChange={(event) => setPayerId(event.target.value)}
            >
              {demoPayerOptions.map((payer) => (
                <option key={payer.id} value={payer.id}>
                  {payer.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Canal"
              className="min-w-40 bg-transparent outline-none"
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
            >
              {demoChannelOptions.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
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

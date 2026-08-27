import { Suspense } from "react";

import { ContextSelectionForm } from "@/components/context-selection-form";
import { requireProtectedPath } from "@/lib/server/authorization";
import {
  getMissingDatabaseConfig,
  getPostgresPool,
  withPostgresRlsContext,
} from "@/lib/server/database";
import type { AuthorizationActor } from "@/lib/security/authorization-policy";
import { isDemoRuntimeEnvironment } from "@/lib/security/environment";
import {
  consolidatedCompanyId,
  demoBranches,
  demoBusinessLineOptions,
  demoCompanyOptions,
  demoCountryOptions,
  regionalCountryId,
  type BranchOption,
  type BusinessLineOption,
  type CompanyOption,
  type CountryOption,
} from "@/lib/tenant/demo-context";
import type { BusinessLineCode } from "@/lib/analytics/kpi-registry";

type OfficialCountryRow = {
  currency_code: string | null;
  date_format: string;
  id: string;
  iso2: string;
  name: string;
  time_zone: string;
};

type OfficialCompanyRow = {
  id: string;
  key: string;
  name: string;
  unit_type: CompanyOption["unitType"];
};

type OfficialBranchRow = {
  city: string;
  code: string;
  company_id: string;
  country_id: string;
  id: string;
  name: string;
  operational_area_id: string | null;
  unit_type: CompanyOption["unitType"];
};

type OfficialContextOptions = {
  branches: BranchOption[];
  businessLines: BusinessLineOption[];
  companies: CompanyOption[];
  countries: CountryOption[];
};

const unrestrictedOfficialContextRoles = new Set([
  "super_admin",
  "webmaster_admin",
  "ceo",
  "gerente_operaciones",
]);

const officialLineByUnitType: Record<
  Exclude<CompanyOption["unitType"], "consolidado">,
  BusinessLineCode
> = {
  fisioterapia: "PHYSIOTHERAPY",
  imagenes: "IMAGING",
  laboratorio: "LABORATORY",
};

function lineCodeForUnitType(unitType: CompanyOption["unitType"]) {
  return unitType === "consolidado"
    ? "CONSOLIDATED"
    : officialLineByUnitType[unitType];
}

function canReadAllOfficialContext(actor: AuthorizationActor) {
  return unrestrictedOfficialContextRoles.has(actor.roleKey);
}

function buildOfficialBranchAccessPredicate(actor: AuthorizationActor) {
  if (canReadAllOfficialContext(actor)) {
    return {
      parameters: [],
      predicate: "true",
    };
  }

  return {
    parameters: [actor.userId],
    predicate: `
      (
        exists (
          select 1
          from public.user_branch_access uba
          where uba.user_id = $1::uuid
            and uba.branch_id = b.id
        )
        or exists (
          select 1
          from public.manager_assignments ma
          join public.roles r on r.id = ma.role_id
          where ma.profile_id = $1::uuid
            and ma.status = 'active'
            and ma.deactivated_at is null
            and ma.organization_id = b.organization_id
            and ma.country_id = b.country_id
            and ma.company_id = b.company_id
            and (
              (
                r.key = 'gerente_area'
                and ma.branch_id is null
                and ma.operational_area_id = b.operational_area_id
              )
              or (
                r.key = 'gerente_sucursal'
                and ma.branch_id = b.id
              )
            )
        )
        or exists (
          select 1
          from public.user_roles ur
          join public.roles r on r.id = ur.role_id
          where ur.user_id = $1::uuid
            and coalesce(ur.status, 'active') = 'active'
            and ur.deactivated_at is null
            and ur.organization_id = b.organization_id
            and (ur.country_id is null or ur.country_id = b.country_id)
            and (ur.company_id is null or ur.company_id = b.company_id)
            and (
              (
                r.key = 'gerente_area'
                and ur.operational_area_id = b.operational_area_id
                and (ur.branch_id is null or ur.branch_id = b.id)
              )
              or (
                r.key = 'gerente_sucursal'
                and ur.branch_id = b.id
              )
            )
        )
      )
    `,
  };
}

function buildOfficialOptions({
  branches,
  companies,
  countries,
}: {
  branches: OfficialBranchRow[];
  companies: OfficialCompanyRow[];
  countries: OfficialCountryRow[];
}): OfficialContextOptions {
  const countryOptions: CountryOption[] = countries.map((country) => ({
    currencyCode: country.currency_code ?? "USD",
    dateFormat: country.date_format,
    id: country.id,
    iso2: country.iso2,
    isDemo: false,
    name: country.name,
    timeZone: country.time_zone,
  }));
  const companyOptions: CompanyOption[] = companies.map((company) => ({
    id: company.id,
    isDemo: false,
    key: company.key,
    name: company.name,
    unitType: company.unit_type,
  }));
  const companyById = new Map(companyOptions.map((company) => [company.id, company]));
  const businessLines: BusinessLineOption[] = companies.map((company) => ({
    code: lineCodeForUnitType(company.unit_type),
    companyId: company.id,
    id: `business-line-${company.key}`,
    isDemo: false,
    name: company.name,
    unitType: company.unit_type,
  }));
  const branchOptions: BranchOption[] = branches.map((branch) => ({
    businessLineCode: lineCodeForUnitType(branch.unit_type),
    city: branch.city,
    code: branch.code,
    companyId: branch.company_id,
    countryId: branch.country_id,
    id: branch.id,
    isDemo: false,
    name: branch.name,
    operationalAreaId: branch.operational_area_id ?? undefined,
  }));

  return {
    branches: branchOptions,
    businessLines:
      businessLines.length > 1
        ? [
            {
              code: "CONSOLIDATED",
              companyId: null,
              id: consolidatedCompanyId,
              isConsolidated: true,
              isDemo: false,
              name: "Consolidado",
              unitType: "consolidado",
            },
            ...businessLines,
          ]
        : businessLines,
    companies:
      companyOptions.length > 1
        ? [
            {
              id: consolidatedCompanyId,
              isConsolidated: true,
              isDemo: false,
              key: "vista-consolidada",
              name: "Vista consolidada",
              unitType: "consolidado",
            },
            ...companyOptions,
          ]
        : companyOptions.filter((company) => companyById.has(company.id)),
    countries:
      countryOptions.length > 1
        ? [
            {
              currencyCode: "MULTI",
              dateFormat: "dd/MM/yyyy",
              id: regionalCountryId,
              iso2: "REG",
              isDemo: false,
              name: "Vista regional",
              scope: "regional",
              timeZone: "America/El_Salvador",
            },
            ...countryOptions,
          ]
        : countryOptions,
  };
}

async function getOfficialContextOptions(
  actor: AuthorizationActor,
): Promise<OfficialContextOptions> {
  if (getMissingDatabaseConfig().length > 0) {
    return { branches: [], businessLines: [], companies: [], countries: [] };
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    return await withPostgresRlsContext(client, actor, async () => {
      const branchAccess = buildOfficialBranchAccessPredicate(actor);
      const branches = await client.query<OfficialBranchRow>(
        `
          select
            b.id,
            b.country_id,
            b.company_id,
            b.operational_area_id,
            b.code,
            b.name,
            b.city,
            co.unit_type
          from public.branches b
          join public.companies co on co.id = b.company_id
          where b.is_demo = false
            and b.status = 'active'
            and b.deleted_at is null
            and co.is_demo = false
            and ${branchAccess.predicate}
          order by b.name
        `,
        branchAccess.parameters,
      );
      const countryIds = Array.from(
        new Set(branches.rows.map((branch) => branch.country_id)),
      );
      const companyIds = Array.from(
        new Set(branches.rows.map((branch) => branch.company_id)),
      );

      if (countryIds.length === 0 || companyIds.length === 0) {
        return { branches: [], businessLines: [], companies: [], countries: [] };
      }

      const [countries, companies] = await Promise.all([
        client.query<OfficialCountryRow>(
          `
            select distinct
              c.id,
              c.iso2,
              c.name,
              c.time_zone,
              c.date_format,
              cu.code as currency_code
            from public.countries c
            left join public.currencies cu on cu.id = c.currency_id
            where c.is_demo = false
              and c.id = any($1::uuid[])
            order by c.name
          `,
          [countryIds],
        ),
        client.query<OfficialCompanyRow>(
          `
            select distinct
              co.id,
              co.key,
              co.name,
              co.unit_type
            from public.companies co
            where co.is_demo = false
              and co.id = any($1::uuid[])
            order by co.name
          `,
          [companyIds],
        ),
      ]);

      return buildOfficialOptions({
        branches: branches.rows,
        companies: companies.rows,
        countries: countries.rows,
      });
    });
  } finally {
    client.release();
  }
}

async function ContextSelectionGate() {
  const access = await requireProtectedPath("/protected/context");
  const isDemoEnvironment = isDemoRuntimeEnvironment();
  const options = isDemoEnvironment
    ? {
        branches: demoBranches,
        businessLines: demoBusinessLineOptions,
        companies: demoCompanyOptions,
        countries: demoCountryOptions,
      }
    : await getOfficialContextOptions(access);

  return (
    <ContextSelectionForm
      branches={options.branches}
      businessLines={options.businessLines}
      companies={options.companies}
      countries={options.countries}
      isDemoEnvironment={isDemoEnvironment}
      userEmail={access.email}
    />
  );
}

export default function ContextPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando contexto autorizado...
        </div>
      }
    >
      <ContextSelectionGate />
    </Suspense>
  );
}

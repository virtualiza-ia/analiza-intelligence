# Analiza Intelligence

Analiza Intelligence is a corporate Business Intelligence web platform for Analiza operations in Central America. It is designed to centralize, validate, analyze, and visualize operational and financial data across countries, business units, branches, managers, professionals, services, and data sources.

Initial business units:

- Analiza Fisioterapia
- Analiza Laboratorio
- Analiza Imagenes

Initial countries:

- Guatemala
- Belice
- El Salvador
- Honduras
- Nicaragua
- Costa Rica
- Panama

## Stack

- Next.js App Router
- TypeScript strict mode
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Row Level Security
- Tailwind CSS
- shadcn/ui primitives
- lucide-react icons

## Current Phase

Phase 3 baseline plus the executive DEMO expansion is now in place:

- Phase 0 documentation and agent rules
- Supabase core migration and DEMO seed
- RLS helper functions and policies
- protected executive view selection by region/country, business unit, branch, and date range
- `Crear cuenta` visible as controlled provisioning, without public self-registration
- local `Admin DEMO` access for executive exploration without real credentials
- executive shell with collapsible sidebar
- persistent context selector in the protected header
- executive DEMO dashboard with KPI cards, charts, sources, insights, and financial/operational health by business
- operational migration for appointments, capacity, services, professionals, and normalized statuses
- DEMO views for appointments by business, capacity, branches, manager performance, bonuses, finances, services, goals, templates, connectors, data quality, users, account settings, and audit
- El Salvador branch result templates recognized for Aguilares, Chalatenango, Constitucion, La Libertad, Merliot 2, Plaza Sur, and Santa Tecla
- pure occupancy and appointment-rate formulas with tests
- validation scripts

The next phase should connect these DEMO panels to live Supabase assignments, real templates, and authorized APIs.

## Local Setup

Create `.env.local` from `.env.example` and configure:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not add service role keys to browser-exposed variables.

Local DEMO admin access is enabled outside Vercel production so the app can be explored before real users are provisioned. To disable it locally:

```env
ANALIZA_DISABLE_DEMO_ADMIN=true
```

Install dependencies if needed:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

## Validation

Run these checks before completing each phase:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Documentation

Start with:

- [Agent rules](AGENTS.md)
- [Product scope](docs/product-scope.md)
- [Architecture](docs/architecture.md)
- [Database design](docs/database-design.md)
- [Security model](docs/security-model.md)
- [Design system](docs/design-system.md)
- [KPI dictionary](docs/kpi-dictionary.md)
- [Data ingestion](docs/data-ingestion.md)
- [Connectors](docs/connectors.md)
- [Implementation plan](docs/implementation-plan.md)
- [Deployment](docs/deployment.md)
- [User guide](docs/user-guide.md)

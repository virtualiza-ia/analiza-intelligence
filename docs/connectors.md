# Connectors

## Connector Types

- REST API
- GraphQL API
- database
- webhook
- SFTP file
- manual upload
- authorized scraping
- billing system
- CRM

## TypeScript Contract

```ts
interface DataConnector {
  testConnection(): Promise<ConnectionResult>;
  fetchSchema(): Promise<SourceSchema>;
  sync(params: SyncParams): Promise<SyncResult>;
  getStatus(): Promise<ConnectorStatus>;
}
```

Concrete interfaces will be added in the connector phase.

## Required Metadata

Each connector records:

- name
- type
- country
- company
- optional branch
- status
- last sync
- next sync
- frequency
- server-side credential status
- synced fields
- mappings
- run logs
- errors
- retries
- record count
- latest source data date
- responsible person

## Demo Adapters

Create DEMO adapters for:

- invoicing
- CRM
- fisioterapia
- laboratorio
- imagenes
- appointments
- costs
- targets
- payroll and bonuses

Real connectors remain disabled until credentials and authorization are configured.

When a real connector is not possible, the matching approved template remains the source of truth. The connector page must show whether a KPI is fed by API, endpoint, CRM, billing system, SFTP, or manual template.

## Authorized Scraping

Scraping connectors must not evade authentication, CAPTCHA, MFA, rate limits, or technical protections. They must use an authorized session, support configurable selectors/adapters, detect HTML structure changes, record extraction date/time, keep raw data separate, prevent duplicates, support manual execution, prepare scheduled execution, and register audit logs.

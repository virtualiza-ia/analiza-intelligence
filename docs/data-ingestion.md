# Data Ingestion

See also [Import operations playbook](import-operations-playbook.md) for the
business-line upload catalog, connector fallback model, versioning rules and
publication controls used by the Importaciones screen.

See also [Template download library](template-download-library.md) for the
Plantillas screen, package downloads by business line and last-upload workbook
contract.

## Import Assistant

The import center uses this flow:

1. Select country.
2. Select company.
3. Select branch.
4. Select data type.
5. Select date range.
6. Download template.
7. Upload file.
8. Detect headers.
9. Map columns.
10. Validate.
11. Preview.
12. Show errors.
13. Show warnings.
14. Confirm import.
15. Process.
16. Show result.
17. Register audit.

## Supported Formats

- CSV
- XLSX
- XLS

PDF files may be stored as documentary backup, but must not generate KPIs automatically unless an approved parser exists.

## Validations

- data types
- required fields
- dates
- amounts
- duplicates
- identifiers
- country
- company
- branch
- manager
- service
- professional
- appointment status
- date range
- source template version
- cross-column consistency

No error may import silently.

Phase 3 stores unknown normalized appointment statuses as `unknown` so they can be surfaced in data quality instead of being hidden in KPI calculations.

## Error Handling

Users can download an error report, correct mapping, retry, cancel, view history, and request reversal when no later dependency exists.

## Templates

Initial downloadable templates:

- appointments
- capacity and schedules
- branch result template
- fisioterapia
- laboratorio
- imagenes
- invoicing
- payments
- fixed expenses
- variable expenses
- direct costs
- fixed costs
- variable costs
- targets
- goal suggestions and CEO approvals
- professionals
- services
- branches
- managers
- payroll and bonuses
- CRM and referrers

Each template includes instructions, column definitions, required fields, expected format, DEMO examples, valid catalogs, frequent errors, and template version.

Templates are the root data source when a real API, CRM connector, billing connector, or endpoint is not available. Every KPI must be traceable to an approved connector run or to a specific template, file version, row, uploader, and approval event.

Bulk document uploads and connectors must publish into the same staging and
analytics contracts. Switching from a manual template to a connector should not
change KPI definitions; it should only change the source type and lineage.

## El Salvador Branch Result Template

The current El Salvador branch result workbook is recognized as a branch-level source for:

- branch and manager metadata from `Evaluacion`
- monthly target, actual sales, projected sales, completion percentage, net sales, cost of sale, margin percentage, and absolute margin
- YTD financial history
- order and sales detail from `llenado de venta drsv`
- customer/order operational detail from `Llenado clientes DRSV` and `Llenado Dias y Horas`
- doctor, specialty, visitador, and location data from the medical sheets

Sensitive customer fields such as customer name and phone must be blocked from executive dashboards. The import should store or process them only under controlled, role-protected workflows when needed for validation.

Current validation rules for these files:

- reject or warn on duplicate file uploads
- warn when file period, workbook period, and sales period disagree
- warn when YTD or projection formulas return errors such as `#DIV/0!`
- warn when large sheets require backend row-count verification
- require branch code, manager, area manager, target, actual sales, and cost of sale

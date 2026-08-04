# Design System

## Principles

The product should feel executive, professional, clean, modern, responsive, accessible, and easy to present in meetings. Operational screens should stay dense, calm, and scannable.

## Initial Palette

- Primary navy for structure and navigation.
- Electric blue for active states and primary action accents.
- Very light gray app background.
- White cards for repeated content and bounded tools.
- Red only for alerts and destructive states.
- Green only for positive outcomes.
- Amber for warnings and incomplete data.

## Business Line Identity

The protected BI shell uses one accent color per active business line. The global selector writes the selected context, and the shell applies `data-business-line-theme` so navigation, primary actions, active states and chart variables inherit the correct color.

- Consolidado keeps the executive navy.
- Laboratorio uses indigo as its operating identity.
- Fisioterapia uses teal/green as its operating identity.
- Imagenes uses diagnostic blue as its operating identity.

Line colors identify scope; they do not replace semantic colors. Red remains risk, amber remains warning or incomplete data, and green remains positive performance unless the active line is Fisioterapia.

## Component Guidance

- Use accessible reusable components.
- Use lucide-react icons when an icon exists.
- Use segmented controls for modes, toggles for binary settings, and menus for option sets.
- Keep cards to repeated items, dialogs, and bounded tools.
- Avoid card-in-card layouts.
- Avoid excessive gradients, decorative blobs, 3D charts, and unnecessary animation.
- Every KPI needs a tooltip with definition, formula, source, and last update.

Phase 2 uses a dense executive shell: collapsible sidebar, compact header filters, small KPI cards, and simple 2D bar visualizations. This keeps the BI surface scannable in meetings and avoids misleading decorative charts.

## Role-Based Reading

The shell should reduce cognitive load by role:

- Use grouped navigation instead of a flat module list.
- Keep the role workspace home as the first operational screen.
- Show only essential modules for each role; deeper dashboards should be drilldowns, not default navigation.
- Open every screen with 3 to 5 key signals, one primary alert, and one clear next action before detailed tables.
- Keep global filters as a compact context bar. Put branch, manager, dates, and secondary filters in `Cambiar filtros` or local `Filtros avanzados`.

Large line-of-business presentations should not become endless dashboard pages. Prefer cockpit views with tabs or guided sections: resumen, causas, plan, decisiones, and trazabilidad.

Every role should enter through a role workspace before detailed dashboards. The first screen must answer: what is happening, what needs review, what action is expected, and what data is missing. The sidebar should expose only essential modules for that role; deeper diagnostics remain accessible through drilldowns, tabs, or the role's recommended action.

Dense dashboards such as profesionales, servicios, gerentes y bonos, laboratorio, imagenes, insights and importaciones must use progressive disclosure. Put KPIs and the executive read first, then comparison charts, then detail tables, then rules/audit. Do not render every table, matrix and narrative in one continuous page.

Administrative forms that include wide tables, such as usuarios y permisos, should stack the form above the table or use a full-width form grid. Do not place a narrow form beside a wide table when selectors contain long role, branch, area, or business-line names.

Operational KPI groups should pair numeric lists with compact trend charts when the decision depends on time movement. The chart must show date labels, the current period, a comparison period, and point-level values through hover/title metadata.

When KPI groups include an internal trend chart, stack each group full-width before placing the chart beside its KPI list. Do not place two charted KPI groups side by side and then add another internal side-by-side chart grid; that causes overlap on common desktop widths.

## Branding

Do not invent the logo. Provide configurable slots for:

- group logo
- company logo
- favicon
- corporate colors

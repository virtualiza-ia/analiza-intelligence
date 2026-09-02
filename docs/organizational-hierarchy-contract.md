# Organizational Hierarchy Contract

This contract records the implementation rules from the reviewed organizational hierarchy without copying personal names, emails or compensation rows into the repository.

The hierarchy is role-based only at these levels:

```text
CEO
Gerente de Operaciones
Gerente de Area
Gerente de Sucursal
Usuario Operativo / Viewer
```

Country, zone, business line and branch are scope attributes, not roles.

The source hierarchy contains 95 operational assignments: 60 in El Salvador and 35 in Honduras. By line, the assignments are 76 Laboratorio, 12 Imagenes and 7 Fisioterapia. The system must therefore model the assignment as the authoritative unit below a branch manager:

```text
1 gerente_sucursal user
  -> N manager_assignments
       -> country + business line + operational area + branch
       -> optional management level and base bonus
```

Required behavior:

- A branch manager may own multiple active assignments.
- The same branch manager may report to different area managers when assignments are in different lines or areas.
- A vacant branch manager position keeps the branch or assignment visible to area, operations and executive roles with `manager_user_id = null` or equivalent nullable assignment ownership.
- Email is a login/contact field only. It must not be used as the primary key for organizational identity, assignment matching or bonus identity.
- Branches must not be deduplicated by display name alone. The effective business key includes organization, country, business line/company and branch code.
- Management level and base bonus are assignment attributes in `manager_assignments`, not global immutable profile attributes.
- Honduras assignments may exist without branch manager email, bonus or category metadata. Missing metadata must remain explicit instead of being invented.

Implementation references:

- `manager_assignments` stores manager scope and incentives by assignment.
- `reporting_lines` stores scoped GA -> GS delegation/audit relationships so one GS can have different reporting relationships in different operational lines.
- `/api/users/branch-managers` returns branch managers by assignment, not one collapsed row per profile.

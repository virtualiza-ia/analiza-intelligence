import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/session";
import { createInvitation } from "@/lib/auth/user-lifecycle";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";

type Payload = {
  email?: unknown;
  fullName?: unknown;
  roleKey?: unknown;
  scope?: unknown;
};

function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && roleKeys.includes(value as RoleKey);
}

function readOptionalUuid(value: unknown) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined;
}

export async function POST(request: Request) {
  const actor = await getAuthenticatedUser();

  if (!actor) {
    return NextResponse.json({ error: "Debes iniciar sesion." }, { status: 401 });
  }
  const payload = (await request.json().catch(() => null)) as Payload | null;
  const email = typeof payload?.email === "string"
    ? payload.email.trim().toLowerCase()
    : "";
  const fullName = typeof payload?.fullName === "string"
    ? payload.fullName.trim()
    : "";

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    fullName.length < 2 ||
    fullName.length > 120 ||
    !isRoleKey(payload?.roleKey)
  ) {
    return NextResponse.json(
      { error: "Revisa nombre, correo y rol de la invitacion." },
      { status: 400 },
    );
  }

  const rawScope =
    typeof payload.scope === "object" && payload.scope !== null
      ? (payload.scope as Record<string, unknown>)
      : {};

  try {
    const invitation = await createInvitation(actor, {
      email,
      fullName,
      roleKey: payload.roleKey,
      scope: {
        branchId: readOptionalUuid(rawScope.branchId),
        companyId: readOptionalUuid(rawScope.companyId),
        countryId: readOptionalUuid(rawScope.countryId),
        operationalAreaId: readOptionalUuid(rawScope.operationalAreaId),
      },
    });

    return NextResponse.json({
      expiresAt: invitation.expiresAt,
      invitationId: invitation.id,
      ok: true,
    });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "INVITATION_FORBIDDEN" ? 403 :
      code === "INVITATION_RATE_LIMITED" ? 429 :
      code === "ACCOUNT_EXISTS" ? 409 :
        code === "INVALID_SCOPE" || code === "INVALID_ROLE" ? 400 : 502;
    const message = status === 403
      ? "Tu rol no puede crear ese usuario o alcance."
      : status === 429
        ? "Espera un minuto antes de enviar mas invitaciones."
      : status === 409
        ? "Ya existe una cuenta con ese correo."
        : status === 400
          ? "El rol o alcance seleccionado no es valido."
          : "No se pudo entregar la invitacion. Intenta nuevamente.";

    console.error("User invitation failed", {
      code: ["INVITATION_FORBIDDEN", "INVITATION_RATE_LIMITED", "ACCOUNT_EXISTS", "INVALID_SCOPE", "INVALID_ROLE"].includes(code) ? code : "DELIVERY_FAILED",
      userId: actor.userId,
    });
    return NextResponse.json({ error: message }, { status });
  }
}

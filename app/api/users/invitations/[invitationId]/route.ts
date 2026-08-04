import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/session";
import { resendInvitation, revokeInvitation } from "@/lib/auth/user-lifecycle";

type Props = { params: Promise<{ invitationId: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const actor = await getAuthenticatedUser();
  if (!actor) {
    return NextResponse.json({ error: "Debes iniciar sesion." }, { status: 401 });
  }

  const { invitationId } = await params;
  const payload = (await request.json().catch(() => null)) as { action?: unknown } | null;

  if (!/^[0-9a-f-]{36}$/i.test(invitationId) ||
      (payload?.action !== "resend" && payload?.action !== "revoke")) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  try {
    if (payload.action === "resend") {
      await resendInvitation(actor, invitationId);
    } else {
      await revokeInvitation(actor, invitationId);
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "INVITATION_FORBIDDEN" ? 403 :
      code === "INVITATION_NOT_PENDING" ? 409 : 502;
    return NextResponse.json(
      { error: status === 403 ? "No tienes permiso para administrar esta invitacion." : status === 409 ? "La invitacion ya no esta pendiente." : "No se pudo completar la operacion." },
      { status },
    );
  }
}

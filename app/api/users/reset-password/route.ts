import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import {
  getLocalUserPasswordTargetByEmail,
  resetLocalUserTemporaryPassword,
} from "@/lib/server/local-auth";
import { canPerformAction } from "@/lib/security/authorization-policy";

type ResetPasswordRequest = {
  email?: unknown;
  temporaryPassword?: unknown;
};

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

export async function POST(request: Request) {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para resetear contrasenas.", 401);
  }

  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    return jsonError(
      "Faltan variables privadas para resetear contrasenas.",
      503,
      missingConfig,
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | ResetPasswordRequest
    | null;
  const email =
    typeof payload?.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";
  const temporaryPassword =
    typeof payload?.temporaryPassword === "string"
      ? payload.temporaryPassword
      : "";

  if (!email || !temporaryPassword) {
    return jsonError("Completa correo y contrasena temporal.", 400);
  }

  const target = await getLocalUserPasswordTargetByEmail(email);

  if (!target) {
    return jsonError("No encontre un usuario activo con ese correo.", 404);
  }

  if (target.userId === actor.userId) {
    return jsonError("No puedes resetear tu propia contrasena desde aqui.", 403);
  }

  if (
    !canPerformAction(actor, "users.change_scope", {
      roleKey: target.roleKey,
      scope: target.scope,
      targetUserId: target.userId,
    })
  ) {
    return jsonError(
      "Tu rol solo puede resetear usuarios de nivel inferior y dentro de tu alcance.",
      403,
    );
  }

  try {
    const user = await resetLocalUserTemporaryPassword({
      actorUserId: actor.userId,
      email,
      password: temporaryPassword,
    });

    return NextResponse.json({
      ok: true,
      status: "reset",
      user: {
        email: user.email,
        roleKey: user.roleKey,
        userId: user.userId,
      },
    });
  } catch (error: unknown) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "No se pudo resetear la contrasena.",
      400,
    );
  }
}

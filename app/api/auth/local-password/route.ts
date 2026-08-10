import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readLocalSession } from "@/lib/auth/local-session";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import { changeAuthenticatedLocalUserPassword } from "@/lib/server/local-auth";

type LocalPasswordRequest = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const localSession = (() => {
    try {
      return readLocalSession(cookieStore);
    } catch {
      return null;
    }
  })();

  if (!localSession) {
    return jsonError("Sesion no autorizada.", 401);
  }

  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    return jsonError(
      "El cambio de contrasena local no esta configurado.",
      503,
      missingConfig,
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | LocalPasswordRequest
    | null;
  const currentPassword =
    typeof payload?.currentPassword === "string"
      ? payload.currentPassword
      : "";
  const newPassword =
    typeof payload?.newPassword === "string" ? payload.newPassword : "";

  if (!currentPassword || !newPassword) {
    return jsonError("Completa contrasena actual y nueva contrasena.", 400);
  }

  try {
    const user = await changeAuthenticatedLocalUserPassword({
      currentPassword,
      newPassword,
      userId: localSession.userId,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error: unknown) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la contrasena.",
      400,
    );
  }
}

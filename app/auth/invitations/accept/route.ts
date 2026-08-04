import { NextResponse } from "next/server";

import {
  createLocalSession,
  localSessionCookieName,
  localSessionDurationSeconds,
} from "@/lib/auth/session";
import { acceptInvitation } from "@/lib/auth/user-lifecycle";

type Payload = { password?: unknown; token?: unknown };

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as Payload | null;
  const token = typeof payload?.token === "string" ? payload.token : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!token || token.length > 128 || !password) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  try {
    const userId = await acceptInvitation(token, password);
    const session = await createLocalSession(userId);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(localSessionCookieName, session.token, {
      httpOnly: true,
      maxAge: localSessionDurationSeconds,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const policyMessage = code.startsWith("La contrasena") || code.startsWith("Incluye")
      ? code
      : null;
    return NextResponse.json(
      { error: policyMessage ?? "La invitacion no es valida o ya vencio." },
      { status: policyMessage ? 400 : 410 },
    );
  }
}

import { NextResponse } from "next/server";

import { resetPassword } from "@/lib/auth/user-lifecycle";

type Payload = { password?: unknown; token?: unknown };

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as Payload | null;
  const token = typeof payload?.token === "string" ? payload.token : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!token || token.length > 128 || !password) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  try {
    await resetPassword(token, password);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const policyMessage = code.startsWith("La contrasena") || code.startsWith("Incluye")
      ? code
      : null;
    return NextResponse.json(
      { error: policyMessage ?? "El enlace no es valido o ya vencio." },
      { status: policyMessage ? 400 : 410 },
    );
  }
}

import { NextResponse } from "next/server";

import { authenticatePassword } from "@/lib/auth/password";
import {
  createLocalSession,
  localSessionCookieName,
  localSessionDurationSeconds,
  revokeLocalSession,
} from "@/lib/auth/session";

type LoginPayload = {
  email?: unknown;
  password?: unknown;
};

function normalizeLoginPayload(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const payload = value as LoginPayload;
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password =
    typeof payload.password === "string" ? payload.password : "";

  if (!email || !password || email.length > 254 || password.length > 256) {
    return null;
  }

  return { email, password };
}

export async function POST(request: Request) {
  const payload = normalizeLoginPayload(
    await request.json().catch(() => null),
  );

  if (!payload) {
    return NextResponse.json(
      { error: "Credenciales invalidas." },
      { status: 400 },
    );
  }

  const result = await authenticatePassword(payload.email, payload.password);

  if (!result.ok) {
    const locked = result.reason === "locked";
    return NextResponse.json(
      {
        error: locked
          ? "Cuenta bloqueada temporalmente por intentos fallidos."
          : "Usuario o contrasena incorrectos.",
      },
      { status: locked ? 423 : 401 },
    );
  }

  const session = await createLocalSession(result.userId);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(localSessionCookieName, session.token, {
    httpOnly: true,
    maxAge: localSessionDurationSeconds,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function DELETE(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${localSessionCookieName}=`))
    ?.slice(localSessionCookieName.length + 1);

  await revokeLocalSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(localSessionCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

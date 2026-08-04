import { NextResponse } from "next/server";

import {
  demoAdminCookieName,
  getDemoAdminEmail,
  getDemoAdminPassword,
  getDemoAdminSessionValue,
  isDemoAdminEnabled,
} from "@/lib/auth/demo-admin";

export function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = "/auth/login";
  url.searchParams.set("error", "demo-admin-login-required");
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  if (!isDemoAdminEnabled()) {
    return NextResponse.json(
      { error: "El acceso DEMO esta desactivado." },
      { status: 403 },
    );
  }

  const configuredPassword = getDemoAdminPassword();

  if (!configuredPassword) {
    return NextResponse.json(
      { error: "Falta configurar ANALIZA_DEMO_ADMIN_PASSWORD." },
      { status: 503 },
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | { email?: unknown; password?: unknown }
    | null;
  const email = typeof payload?.email === "string" ? payload.email.trim() : "";
  const password =
    typeof payload?.password === "string" ? payload.password : "";

  if (
    email.toLowerCase() !== getDemoAdminEmail().toLowerCase() ||
    password !== configuredPassword
  ) {
    return NextResponse.json(
      { error: "Usuario o contrasena incorrectos." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(demoAdminCookieName, getDemoAdminSessionValue(), {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure: process.env.VERCEL_ENV === "production",
  });

  return response;
}

export function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(demoAdminCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.VERCEL_ENV === "production",
  });

  return response;
}

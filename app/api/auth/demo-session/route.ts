import { NextResponse } from "next/server";

import {
  demoAdminCookieName,
  demoRoleCookieName,
  getDemoAdminSessionValue,
  getDemoSessionCookieOptions,
  isDemoAdminEnabled,
} from "@/lib/auth/demo-admin";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";

type DemoSessionRequest = {
  roleKey?: unknown;
};

const localDemoLoginRoles: RoleKey[] = [
  "super_admin",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
  "usuario_operativo",
  "viewer",
];

function isLocalDemoLoginRole(value: unknown): value is RoleKey {
  return (
    typeof value === "string" &&
    roleKeys.includes(value as RoleKey) &&
    localDemoLoginRoles.includes(value as RoleKey)
  );
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, ok: false }, { status });
}

export async function POST(request: Request) {
  if (!isDemoAdminEnabled()) {
    return jsonError("El acceso DEMO local esta desactivado.", 403);
  }

  const payload = (await request.json().catch(() => null)) as
    | DemoSessionRequest
    | null;

  if (!isLocalDemoLoginRole(payload?.roleKey)) {
    return jsonError("Perfil DEMO local invalido.", 400);
  }

  const response = NextResponse.json({ ok: true, roleKey: payload.roleKey });
  const cookieOptions = getDemoSessionCookieOptions();
  response.cookies.set(
    demoAdminCookieName,
    getDemoAdminSessionValue(),
    cookieOptions,
  );
  response.cookies.set(demoRoleCookieName, payload.roleKey, cookieOptions);

  return response;
}

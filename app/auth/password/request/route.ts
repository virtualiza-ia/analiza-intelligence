import { NextResponse } from "next/server";

import { requestPasswordReset } from "@/lib/auth/user-lifecycle";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { email?: unknown }
    | null;
  const email = typeof payload?.email === "string"
    ? payload.email.trim().toLowerCase()
    : "";

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254) {
    await requestPasswordReset(email).catch((error: unknown) => {
      console.error("Password reset request failed", {
        code: error instanceof Error ? error.name : "UnknownError",
      });
    });
  }

  return NextResponse.json({ ok: true });
}

import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { cookies } from "next/headers";
import {
  demoAdminCookieName,
  getDemoAdminEmail,
  hasDemoAdminCookie,
} from "@/lib/auth/demo-admin";
import { hasEnvVars } from "@/lib/utils";

export async function AuthButton() {
  const cookieStore = await cookies();
  const hasDemoAdminSession = hasDemoAdminCookie(
    cookieStore.get(demoAdminCookieName)?.value,
  );

  if (hasDemoAdminSession) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {getDemoAdminEmail()}
        </span>
        <LogoutButton />
      </div>
    );
  }

  if (!hasEnvVars) {
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant={"outline"}>
          <Link href="/auth/login">Ingresar</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims().catch(() => ({
    data: null,
  }));

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">{user.email}</span>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Ingresar</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Crear cuenta</Link>
      </Button>
    </div>
  );
}

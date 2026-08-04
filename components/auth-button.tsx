import Link from "next/link";

import { LogoutButton } from "./logout-button";
import { Button } from "./ui/button";
import {
  getAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/auth/session";

export async function AuthButton({ user }: { user?: AuthenticatedUser }) {
  const authenticatedUser = user ?? (await getAuthenticatedUser());

  if (!authenticatedUser) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href="/auth/login">Ingresar</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-right text-sm">
        <div className="text-muted-foreground">{authenticatedUser.email}</div>
        <div className="text-xs text-muted-foreground">
          {authenticatedUser.roleKey}
        </div>
      </div>
      <LogoutButton />
    </div>
  );
}

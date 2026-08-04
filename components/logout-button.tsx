"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { hasEnvVars } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/auth/demo-admin", { method: "DELETE" });

    if (hasEnvVars) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }

    router.push("/auth/login");
    router.refresh();
  };

  return <Button onClick={logout}>Salir</Button>;
}

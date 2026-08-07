"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { hasEnvVars } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DemoLoginProfile = {
  label: string;
  roleKey:
    | "super_admin"
    | "gerente_operaciones"
    | "gerente_area"
    | "gerente_sucursal"
    | "usuario_operativo"
    | "viewer";
};

const demoLoginProfiles: DemoLoginProfile[] = [
  { label: "Direccion / Super Admin", roleKey: "super_admin" },
  { label: "Gerente de Operaciones", roleKey: "gerente_operaciones" },
  { label: "Gerente de Area", roleKey: "gerente_area" },
  { label: "Gerente de Sucursal", roleKey: "gerente_sucursal" },
  { label: "Usuario Operativo", roleKey: "usuario_operativo" },
  { label: "Viewer", roleKey: "viewer" },
];

export function LoginForm({
  enableLocalDemoLogin = false,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  enableLocalDemoLogin?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDemoRole, setActiveDemoRole] =
    useState<DemoLoginProfile["roleKey"]>("super_admin");
  const router = useRouter();

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/demo-session", {
        body: JSON.stringify({ roleKey: activeDemoRole }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "No se pudo iniciar DEMO local.");
      }

      router.push("/protected/context");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const demoResponse = await fetch("/auth/demo-admin", {
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (demoResponse.ok) {
        router.push("/protected/context");
        router.refresh();
        return;
      }

      const localResponse = await fetch("/api/auth/local-login", {
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (localResponse.ok) {
        router.push("/protected/context");
        router.refresh();
        return;
      }

      if (!hasEnvVars) {
        const localPayload = (await localResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          localPayload?.error ?? "Usuario o contrasena incorrectos.",
        );
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/protected/context");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar sesion</CardTitle>
          <CardDescription>
            Usa la cuenta asignada por el administrador de Analiza.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enableLocalDemoLogin && (
            <div className="mb-6 grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <div>
                <div className="font-semibold">Entorno DEMO local</div>
                <p className="mt-1 text-xs leading-5 text-amber-900">
                  Crea una sesion demo server-side para revision visual. No usa
                  passwords en cliente y esta bloqueado fuera de demo.
                </p>
              </div>
              <Label htmlFor="demo-role">Perfil de prueba autorizado</Label>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none"
                id="demo-role"
                value={activeDemoRole}
                onChange={(event) =>
                  setActiveDemoRole(
                    event.target.value as DemoLoginProfile["roleKey"],
                  )
                }
              >
                {demoLoginProfiles.map((profile) => (
                  <option key={profile.roleKey} value={profile.roleKey}>
                    {profile.label}
                  </option>
                ))}
              </select>
              <Button
                className="w-full"
                disabled={isLoading}
                onClick={handleDemoLogin}
                type="button"
                variant="secondary"
              >
                {isLoading ? "Creando sesion..." : "Entrar en DEMO local"}
              </Button>
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Contrasena</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Recuperar acceso
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Ingresando..." : "Ingresar"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              ¿Necesitas acceso?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Crear cuenta
              </Link>
            </div>
            <div className="mt-4 rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              Admin DEMO tambien requiere usuario y contrasena asignados. No se
              puede entrar al panel solo con el link.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

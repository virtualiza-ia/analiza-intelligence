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

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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

      if (!hasEnvVars) {
        const demoPayload = (await demoResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          demoPayload?.error ?? "Usuario o contrasena incorrectos.",
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

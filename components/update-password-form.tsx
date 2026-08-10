"use client";

import { AlertCircle, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SessionMode = "checking" | "local" | "supabase";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>("checking");
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/local-session", { cache: "no-store" })
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setSessionMode(response.ok ? "local" : "supabase");
      })
      .catch(() => {
        if (isMounted) {
          setSessionMode("supabase");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (password !== confirmPassword) {
        throw new Error("Las contrasenas no coinciden.");
      }

      if (sessionMode === "local") {
        const response = await fetch("/api/auth/local-password", {
          body: JSON.stringify({
            currentPassword,
            newPassword: password,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(
            payload?.error ?? "No se pudo actualizar la contrasena.",
          );
        }

        router.push("/protected/context");
        router.refresh();
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/protected/context");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const isCheckingSession = sessionMode === "checking";
  const isLocalSession = sessionMode === "local";

  return (
    <div
      className={cn(
        "w-full rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-50px_rgba(7,23,45,0.42)] sm:p-8",
        className,
      )}
      {...props}
    >
      <div className="mb-7 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#07172d] text-white shadow-[0_16px_34px_-20px_rgba(7,23,45,0.8)]">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2878ff]">
            Acceso seguro
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
            Cambiar contrasena
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Por seguridad, actualiza tu contrasena antes de continuar a Analiza
            Intelligence.
          </p>
        </div>
      </div>

      <form onSubmit={handlePasswordChange}>
        <div className="flex flex-col gap-5">
          {isLocalSession && (
            <div className="grid gap-2">
              <Label htmlFor="current-password">Contrasena temporal</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="password">Nueva contrasena</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirmar nueva contrasena</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            <div className="flex gap-3">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-[#2878ff]"
                aria-hidden="true"
              />
              <span>
                Usa al menos 10 caracteres y combina letras con numeros.
              </span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="h-12 w-full rounded-2xl bg-[#07172d] text-white hover:bg-[#0b2342]"
            disabled={isLoading || isCheckingSession}
          >
            {isLoading || isCheckingSession ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </span>
            ) : (
              "Guardar y continuar"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

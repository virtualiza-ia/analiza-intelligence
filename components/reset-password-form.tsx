"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Las contrasenas no coinciden.");
      return;
    }
    setLoading(true);
    const response = await fetch("/auth/password/reset", {
      body: JSON.stringify({ password, token }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(result?.error ?? "No se pudo cambiar la contrasena.");
      setLoading(false);
      return;
    }
    setComplete(true);
    setLoading(false);
  }

  if (complete) {
    return <div className="grid gap-4"><p className="text-sm text-muted-foreground">Contrasena actualizada. Las sesiones anteriores fueron cerradas.</p><Button asChild><Link href="/auth/login">Iniciar sesion</Link></Button></div>;
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-2"><Label htmlFor="password">Nueva contrasena</Label><Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
      <div className="grid gap-2"><Label htmlFor="confirmation">Confirmar contrasena</Label><Input id="confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
      <p className="text-xs text-muted-foreground">Usa 12 o mas caracteres, mayuscula, minuscula, numero y simbolo.</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button disabled={loading} type="submit">{loading ? "Actualizando..." : "Cambiar contrasena"}</Button>
    </form>
  );
}

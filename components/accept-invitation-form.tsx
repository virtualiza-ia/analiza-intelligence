"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);
    const response = await fetch("/auth/invitations/accept", {
      body: JSON.stringify({ password, token }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setError(result?.error ?? "No se pudo activar la cuenta.");
      setLoading(false);
      return;
    }

    router.push("/protected");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor="password">Nueva contrasena</Label>
        <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmation">Confirmar contrasena</Label>
        <Input id="confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">Usa 12 o mas caracteres, mayuscula, minuscula, numero y simbolo.</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button disabled={loading} type="submit">{loading ? "Activando..." : "Activar cuenta"}</Button>
    </form>
  );
}

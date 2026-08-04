"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    await fetch("/auth/password/request", {
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Recuperar acceso</CardTitle>
          <CardDescription>Recibe un enlace seguro de un solo uso.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {sent ? (
            <p className="text-sm text-muted-foreground">Si existe una cuenta activa para ese correo, enviamos instrucciones. El enlace vence en 30 minutos.</p>
          ) : (
            <form className="grid gap-4" onSubmit={submit}>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <Button disabled={loading} type="submit">{loading ? "Enviando..." : "Enviar enlace"}</Button>
            </form>
          )}
          <Button asChild className="w-full" variant="outline"><Link href="/auth/login">Volver al login</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}

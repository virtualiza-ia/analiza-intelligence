import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SignUpSearchParams = Promise<{
  email?: string;
  invitation?: string;
}>;

async function SignUpContent({
  searchParams,
}: {
  searchParams: SignUpSearchParams;
}) {
  const params = await searchParams;
  const invitedEmail = params.email;
  const hasInvitation = Boolean(params.invitation);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-muted">
            <ShieldAlert className="size-5 text-primary" />
          </div>
          <CardTitle>
            {hasInvitation ? "Aceptar invitacion" : "Crear cuenta"}
          </CardTitle>
          <CardDescription>
            {hasInvitation
              ? "Recibimos tu invitacion. La cuenta queda ligada al rol y alcance definidos por administracion."
              : "Para usuarios reales, el webmaster/administrador crea el acceso y asigna el rol correspondiente."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {hasInvitation ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                <strong className="text-foreground">Correo invitado:</strong>{" "}
                {invitedEmail ?? "correo pendiente"}
                <br />
                El administrador terminara la activacion para que puedas crear
                tu contrasena y entrar con tu rol asignado.
              </div>
            ) : null}
            <Button asChild className="w-full">
              <Link href="/auth/login">
                {hasInvitation ? "Volver al login" : "Solicitar acceso"}
              </Link>
            </Button>
            {!hasInvitation ? (
              <Button asChild className="w-full" variant="outline">
                <Link href="/auth/demo-admin">Entrar como Admin DEMO</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: SignUpSearchParams;
}) {
  return (
    <Suspense>
      <SignUpContent searchParams={searchParams} />
    </Suspense>
  );
}

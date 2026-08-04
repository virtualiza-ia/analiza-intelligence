import Link from "next/link";
import { Suspense } from "react";

import { AcceptInvitationForm } from "@/components/accept-invitation-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvitationPreview } from "@/lib/auth/user-lifecycle";

type Props = { searchParams: Promise<{ invitation?: string }> };

async function InvitationContent({ searchParams }: Props) {
  const { invitation = "" } = await searchParams;
  const preview = await getInvitationPreview(invitation);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{preview ? "Activa tu cuenta" : "Invitacion no valida"}</CardTitle>
          <CardDescription>
            {preview
              ? `Acceso preparado para ${preview.email}. Crea una contrasena segura para continuar.`
              : "El enlace vencio, fue revocado, ya se utilizo o no existe."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {preview ? (
            <AcceptInvitationForm token={invitation} />
          ) : (
            <Button asChild className="w-full" variant="outline"><Link href="/auth/login">Volver al login</Link></Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page(props: Props) {
  return <Suspense><InvitationContent {...props} /></Suspense>;
}

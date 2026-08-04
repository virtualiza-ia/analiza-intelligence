"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Recuperar acceso</CardTitle>
          <CardDescription>
            La recuperacion automatica por correo aun no esta habilitada.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Solicita al superadministrador un restablecimiento seguro. Nunca
            compartas tu contrasena por correo o mensajeria.
          </p>
          <Button asChild className="w-full" variant="outline">
            <Link href="/auth/login">Volver al login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

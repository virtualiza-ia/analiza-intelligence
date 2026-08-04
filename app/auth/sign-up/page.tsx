import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-muted">
            <ShieldAlert className="size-5 text-primary" />
          </div>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>
            Para usuarios reales, el webmaster/administrador crea el acceso y
            asigna uno de cuatro roles: Webmaster / Administrador, CEO, Gerente
            de operaciones o Gerente de sucursal. Para probar ahora, usa Admin
            DEMO.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <Button asChild className="w-full">
              <Link href="/auth/demo-admin">Entrar como Admin DEMO</Link>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <Link href="/auth/login">Volver al login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

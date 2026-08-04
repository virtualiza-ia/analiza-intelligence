import { ResetPasswordForm } from "@/components/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { searchParams: Promise<{ token?: string }> };

async function UpdatePasswordContent({ searchParams }: Props) {
  const { token = "" } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Nueva contrasena</CardTitle><CardDescription>El enlace es de un solo uso y vence en 30 minutos.</CardDescription></CardHeader>
        <CardContent>{token ? <ResetPasswordForm token={token} /> : <p className="text-sm text-red-600">Falta el token de recuperacion.</p>}</CardContent>
      </Card>
    </div>
  );
}

export default function Page(props: Props) {
  return <Suspense><UpdatePasswordContent {...props} /></Suspense>;
}
import { Suspense } from "react";

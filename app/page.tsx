import Link from "next/link";
import { Suspense } from "react";
import { Building2, Database, ShieldCheck } from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { Button } from "@/components/ui/button";
import { isDemoAdminEnabled } from "@/lib/auth/demo-admin";
import { hasEnvVars } from "@/lib/utils";

export default function Home() {
  const demoAdminEnabled = isDemoAdminEnabled();

  return (
    <main className="min-h-screen bg-muted/30">
      <nav className="border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 text-sm">
          <Link href="/" className="font-semibold">
            Analiza Intelligence
          </Link>
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </nav>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col gap-5">
            <div className="w-fit rounded-md border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              Plataforma corporativa BI
            </div>
            <div className="grid gap-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-foreground">
                Analiza Intelligence
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Centralizacion segura para datos operativos y financieros de
                Analiza Fisioterapia, Analiza Laboratorio y Analiza Imagenes,
                disenada para CEO, gerente de operaciones y gerentes de
                sucursal.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/auth/login">Ingresar</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auth/sign-up">Crear cuenta</Link>
              </Button>
              {demoAdminEnabled ? (
                <Button asChild variant="outline">
                  <Link href="/auth/login">Admin DEMO</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link href="/protected/context">Ver dashboard ejecutivo</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-background p-5">
            <div className="mb-4 text-sm font-medium">
              {demoAdminEnabled ? "Panel ejecutivo DEMO" : "Panel ejecutivo"}
            </div>
            <dl className="grid gap-4 text-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 text-primary" />
                <div>
                  <dt className="font-medium">Acceso protegido</dt>
                  <dd className="text-muted-foreground">
                    Entrada para webmaster/admin, CEO, operaciones y sucursal.
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-4 text-primary" />
                <div>
                  <dt className="font-medium">Modelo multi-tenant</dt>
                  <dd className="text-muted-foreground">
                    Vista regional, pais, empresa, sucursal y periodo.
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Database className="mt-0.5 size-4 text-primary" />
                <div>
                  <dt className="font-medium">Base Supabase</dt>
                  <dd className="text-muted-foreground">
                    Fisioterapia, Laboratorio e Imagenes en un solo panel.
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}

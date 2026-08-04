"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserManagementData } from "@/lib/auth/user-management";

export function UserManagementDashboard({ data }: { data: UserManagementData }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState<string>(data.roles[0]?.key ?? "");
  const [countryId, setCountryId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [operationalAreaId, setOperationalAreaId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState(data.invitations);

  const areas = useMemo(() => data.areas.filter((area) => (!countryId || area.countryId === countryId) && (!companyId || area.companyId === companyId)), [companyId, countryId, data.areas]);
  const branches = useMemo(() => data.branches.filter((branch) => (!countryId || branch.countryId === countryId) && (!companyId || branch.companyId === companyId) && (!operationalAreaId || branch.operationalAreaId === operationalAreaId)), [companyId, countryId, data.branches, operationalAreaId]);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/users/invite", {
      body: JSON.stringify({ email, fullName, roleKey, scope: { branchId: branchId || undefined, companyId: companyId || undefined, countryId: countryId || undefined, operationalAreaId: operationalAreaId || undefined } }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => null)) as { error?: string; expiresAt?: string; invitationId?: string } | null;
    if (!response.ok || !result?.invitationId) {
      setMessage(result?.error ?? "No se pudo enviar la invitacion.");
      setLoading(false);
      return;
    }
    const roleName = data.roles.find((role) => role.key === roleKey)?.name ?? roleKey;
    setInvitations((current) => [{ deliveryStatus: "sent", email: email.trim().toLowerCase(), expiresAt: result.expiresAt ?? new Date().toISOString(), fullName: fullName.trim(), id: result.invitationId!, roleName, status: "pending" }, ...current]);
    setFullName("");
    setEmail("");
    setMessage("Invitacion enviada correctamente.");
    setLoading(false);
  }

  async function updateInvitation(id: string, action: "resend" | "revoke") {
    setMessage(null);
    const response = await fetch(`/api/users/invitations/${id}`, { body: JSON.stringify({ action }), headers: { "Content-Type": "application/json" }, method: "PATCH" });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setMessage(result?.error ?? "No se pudo actualizar la invitacion.");
      return;
    }
    setInvitations((current) => current.map((invitation) => invitation.id === id ? { ...invitation, deliveryStatus: action === "resend" ? "sent" : invitation.deliveryStatus, status: action === "revoke" ? "revoked" : invitation.status } : invitation));
    setMessage(action === "resend" ? "Invitacion reenviada." : "Invitacion revocada.");
  }

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div><Badge variant="outline">Administracion segura</Badge><h1 className="mt-3 text-3xl font-semibold">Usuarios y permisos</h1><p className="mt-2 text-sm text-muted-foreground">Invita usuarios con rol y alcance verificados en el servidor.</p></div>
      <Card><CardHeader><CardTitle>Invitar usuario</CardTitle><CardDescription>El usuario crea su propia contrasena mediante un enlace de un solo uso.</CardDescription></CardHeader><CardContent><form className="grid gap-4 md:grid-cols-2" onSubmit={invite}>
        <div className="grid gap-2"><Label htmlFor="fullName">Nombre</Label><Input id="fullName" required value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="email">Correo</Label><Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
        <Select label="Rol" value={roleKey} onChange={setRoleKey} options={data.roles.map((role) => ({ label: role.name, value: role.key }))} required />
        <Select label="Pais" value={countryId} onChange={(value) => { setCountryId(value); setOperationalAreaId(""); setBranchId(""); }} options={data.countries.map((item) => ({ label: item.name, value: item.id }))} />
        <Select label="Linea de negocio" value={companyId} onChange={(value) => { setCompanyId(value); setOperationalAreaId(""); setBranchId(""); }} options={data.companies.map((item) => ({ label: item.name, value: item.id }))} />
        <Select label="Gerencia de area" value={operationalAreaId} onChange={(value) => { setOperationalAreaId(value); setBranchId(""); }} options={areas.map((item) => ({ label: item.name, value: item.id }))} required={roleKey === "gerente_area"} />
        <Select label="Sucursal" value={branchId} onChange={setBranchId} options={branches.map((item) => ({ label: item.name, value: item.id }))} required={roleKey === "gerente_sucursal" || roleKey === "usuario_operativo"} />
        <div className="md:col-span-2">{message ? <p className="mb-3 text-sm" role="status">{message}</p> : null}<Button disabled={loading || !roleKey} type="submit">{loading ? "Enviando..." : "Enviar invitacion"}</Button></div>
      </form></CardContent></Card>
      <Card><CardHeader><CardTitle>Invitaciones</CardTitle><CardDescription>Últimos 100 registros de la organización.</CardDescription></CardHeader><CardContent className="grid gap-3">{invitations.length === 0 ? <p className="text-sm text-muted-foreground">No hay invitaciones.</p> : invitations.map((invitation) => <div className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between" key={invitation.id}><div><p className="font-medium">{invitation.fullName}</p><p className="text-sm text-muted-foreground">{invitation.email} · {invitation.roleName}</p><p className="text-xs text-muted-foreground">Estado: {invitation.status} · Entrega: {invitation.deliveryStatus}</p></div>{invitation.status === "pending" ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => updateInvitation(invitation.id, "resend")}>Reenviar</Button><Button size="sm" variant="destructive" onClick={() => updateInvitation(invitation.id, "revoke")}>Revocar</Button></div> : null}</div>)}</CardContent></Card>
    </section>
  );
}

function Select({ label, onChange, options, required = false, value }: { label: string; onChange: (value: string) => void; options: Array<{ label: string; value: string }>; required?: boolean; value: string }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><select className="h-10 rounded-md border bg-background px-3 text-sm" id={id} required={required} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Sin alcance específico</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}

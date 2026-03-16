import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getAmministratoreDetail } from "../actions";
import { AmministratoreDetailClient } from "./AmministratoreDetailClient";

export default async function AmministratoreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions["Amministratori"];
  if (!modulePerms?.READ) redirect("/");

  const { id } = await params;
  const sp = (await searchParams) || {};
  const returnTo = sp.returnTo || null;
  const res = await getAmministratoreDetail(id);
  if (!res?.success) {
    redirect("/amministratori");
  }

  const amministratore = (res as any).amministratore;
  const fatture = Array.isArray((res as any).fatture) ? (res as any).fatture : [];
  const impianti = Array.isArray(amministratore?.impianti) ? amministratore.impianti : [];

  return (
    <AmministratoreDetailClient
      amministratore={amministratore}
      impianti={impianti}
      fatture={fatture}
      returnTo={returnTo}
      permissionsFatture={permissions?.Fatture}
    />
  );
}

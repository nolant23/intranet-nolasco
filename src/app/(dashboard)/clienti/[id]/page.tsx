import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getClienteDetail } from "../actions";
import { ClienteDetailPageClient } from "./ClienteDetailPageClient";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions?.Clienti;
  const fatturePerms = permissions?.Fatture;
  if (!modulePerms?.READ) redirect("/");

  const { id } = await params;
  const res = await getClienteDetail(id);
  if (!res?.success || !(res as any).data) {
    redirect("/clienti");
  }

  const cliente = (res as any).data;

  return (
    <ClienteDetailPageClient
      cliente={cliente}
      permissionsFatture={fatturePerms || {}}
    />
  );
}

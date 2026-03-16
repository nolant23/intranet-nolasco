import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getFatturaById } from "../actions";
import { FatturaDetailPageClient } from "./FatturaDetailPageClient";

export default async function FatturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions?.Fatture;
  if (!modulePerms?.READ) redirect("/");

  const { id } = await params;
  const res = await getFatturaById(id);
  if (!res?.success || !(res as any).data) {
    redirect("/fatture");
  }

  const fattura = (res as any).data;

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <FatturaDetailPageClient fattura={fattura} permissions={modulePerms} />
    </div>
  );
}

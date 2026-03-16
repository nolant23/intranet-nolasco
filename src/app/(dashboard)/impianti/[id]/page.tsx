import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getImpiantoDetail } from "../actions";
import { ImpiantoDetailClient } from "./ImpiantoDetailClient";

export default async function ImpiantoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "TECNICO") redirect("/tecnici");

  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Impianti?.READ) redirect("/");

  const { id } = await params;
  const res = await getImpiantoDetail(id);
  if (!res.success) {
    if (res.forbidden) redirect("/");
    redirect("/impianti");
  }
  if (!res.impianto) redirect("/impianti");

  const d = res.impianto;

  return <ImpiantoDetailClient d={d} />;
}

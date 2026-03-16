import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getContrattoById, getContrattiIdAndImpiantoId } from "../actions";
import { getImpianti } from "../../impianti/actions";
import { ContrattoDetailClient } from "./ContrattoDetailClient";

export default async function ContrattoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions?.Contratti;
  if (!modulePerms?.READ) redirect("/");

  const { id } = await params;
  const [res, impiantiResult, contrattiIdImpianto] = await Promise.all([
    getContrattoById(id),
    getImpianti(),
    getContrattiIdAndImpiantoId(),
  ]);
  if (!res?.success || !(res as any).data) redirect("/contratti");
  if (!impiantiResult.ok && impiantiResult.forbidden) redirect("/");

  const c = (res as any).data;
  const impianti = impiantiResult.ok ? impiantiResult.data : [];

  return (
    <ContrattoDetailClient
      c={c}
      impianti={impianti}
      contrattiIdImpianto={contrattiIdImpianto}
      permissions={modulePerms}
    />
  );
}

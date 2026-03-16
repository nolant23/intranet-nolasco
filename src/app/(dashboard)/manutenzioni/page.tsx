import dynamic from "next/dynamic";
import { getManutenzioniPaginated, getImpiantiDaManutenere, getTecnici } from "./actions";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui/table-skeleton";

const ManutenzioniClient = dynamic(
  () => import("./components/ManutenzioniClient").then((m) => m.ManutenzioniClient),
  { loading: () => <PageSkeleton /> }
);

const PAGE_SIZE = 25;

export default async function ManutenzioniPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  if (currentUser.role === "TECNICO") redirect("/tecnici/servizi/manutenzioni");

  const permissions = await getPermissionsForRole(currentUser.role);
  const modulePerms = permissions["Manutenzioni"];
  if (!modulePerms?.READ) redirect("/");

  const [paginatedResult, impiantiDaManutenere, tecnici] = await Promise.all([
    getManutenzioniPaginated(1, PAGE_SIZE, null),
    getImpiantiDaManutenere(),
    getTecnici(),
  ]);

  if (!paginatedResult.ok) {
    if (paginatedResult.forbidden) redirect("/");
    redirect("/");
  }

  const { data: manutenzioni, total } = paginatedResult;

  return (
    <ManutenzioniClient
      initialManutenzioni={manutenzioni}
      initialTotal={total}
      pageSize={PAGE_SIZE}
      impiantiDaManutenere={impiantiDaManutenere}
      tecnici={tecnici}
      currentUser={currentUser}
      permissions={modulePerms}
    />
  );
}

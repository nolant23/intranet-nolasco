import dynamic from "next/dynamic";
import { getInterventiPaginated, getImpianti, getTecnici } from "@/app/(dashboard)/interventi/actions";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui/table-skeleton";

const InterventiClient = dynamic(
  () => import("@/app/(dashboard)/interventi/components/InterventiClient").then((m) => m.InterventiClient),
  { loading: () => <PageSkeleton /> }
);

const PAGE_SIZE = 25;

export default async function TecnicoInterventiPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  const permissions = await getPermissionsForRole(currentUser.role);
  const modulePerms = permissions["Interventi"];
  if (!modulePerms?.READ) redirect("/tecnici");

  const [{ data: interventi, total }, impianti, tecnici] = await Promise.all([
    getInterventiPaginated(1, PAGE_SIZE),
    getImpianti(),
    getTecnici(),
  ]);

  return (
    <InterventiClient
      initialInterventi={interventi}
      initialTotal={total}
      pageSize={PAGE_SIZE}
      impianti={impianti}
      tecnici={tecnici}
      currentUser={currentUser}
      permissions={modulePerms}
    />
  );
}

import dynamic from "next/dynamic";
import { getContratti } from "./actions";
import { getImpianti } from "../impianti/actions";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui/table-skeleton";

const ContrattiClient = dynamic(
  () => import("./components/ContrattiClient").then((m) => m.ContrattiClient),
  { loading: () => <PageSkeleton /> }
);

export default async function ContrattiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions["Contratti"];
  if (!modulePerms?.READ) redirect("/");

  const [contratti, impiantiResult] = await Promise.all([getContratti(), getImpianti()]);

  const impianti = impiantiResult.ok ? impiantiResult.data : [];
  if (!impiantiResult.ok && impiantiResult.forbidden) redirect("/");

  return <ContrattiClient contratti={contratti} impianti={impianti} permissions={modulePerms} />;
}

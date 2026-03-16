import { getImpiantiPaginated } from "./actions";
import { getClienti } from "../clienti/actions";
import { getAmministratori } from "../amministratori/actions";
import { ImpiantiClient } from "./components/ImpiantiClient";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

const PAGE_SIZE = 25;

export default async function ImpiantiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "TECNICO") redirect("/tecnici");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions["Impianti"];

  if (!modulePerms?.READ) {
    redirect("/");
  }

  const [result, clienti, amministratori] = await Promise.all([
    getImpiantiPaginated(1, PAGE_SIZE, null),
    getClienti(),
    getAmministratori(),
  ]);

  if (!result.ok) {
    if (result.forbidden) redirect("/");
    redirect("/");
  }

  return (
    <ImpiantiClient
      initialImpianti={result.data}
      initialTotal={result.total}
      pageSize={PAGE_SIZE}
      clienti={clienti}
      amministratori={amministratori}
      permissions={modulePerms}
    />
  );
}

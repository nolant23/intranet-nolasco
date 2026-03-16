import dynamic from "next/dynamic";
import { getClientiPaginated } from "./actions";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui/table-skeleton";

const ClientiClient = dynamic(
  () => import("./components/ClientiClient").then((m) => m.ClientiClient),
  { loading: () => <PageSkeleton /> }
);

const PAGE_SIZE = 25;

export default async function ClientiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions["Clienti"];
  if (!modulePerms?.READ) redirect("/");

  const { data: clienti, total } = await getClientiPaginated(1, PAGE_SIZE, null);

  return (
    <ClientiClient
      initialClienti={clienti}
      initialTotal={total}
      pageSize={PAGE_SIZE}
      permissions={modulePerms}
    />
  );
}

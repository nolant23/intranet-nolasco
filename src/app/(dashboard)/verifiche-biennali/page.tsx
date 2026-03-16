import dynamic from "next/dynamic";
import { getVerificheBiennaliPaginated } from "./actions";
import { getImpianti, getTecnici } from "../interventi/actions";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui/table-skeleton";

const VerificheBiennaliClient = dynamic(
  () => import("./components/VerificheBiennaliClient").then((m) => m.VerificheBiennaliClient),
  { loading: () => <PageSkeleton /> }
);

const PAGE_SIZE = 25;

export default async function VerificheBiennaliPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  if (currentUser.role === "TECNICO") redirect("/tecnici/servizi/verifiche-biennali");

  const permissions = await getPermissionsForRole(currentUser.role);
  if (!permissions?.VerificheBiennali?.READ) redirect("/");
  const modulePerms = permissions.VerificheBiennali;

  const [result, impianti, tecnici, params] = await Promise.all([
    getVerificheBiennaliPaginated(1, PAGE_SIZE, null),
    getImpianti(),
    getTecnici(),
    searchParams,
  ]);

  return (
    <VerificheBiennaliClient
      initialVerifiche={result.data}
      initialTotal={result.total}
      pageSize={PAGE_SIZE}
      impianti={impianti}
      tecnici={tecnici}
      currentUser={currentUser}
      permissions={modulePerms}
      initialFormOpen={params?.new === "true"}
    />
  );
}

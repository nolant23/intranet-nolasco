import dynamic from "next/dynamic";
import { getVerificheBiennaliPaginated } from "@/app/(dashboard)/verifiche-biennali/actions";
import { getImpianti, getTecnici } from "@/app/(dashboard)/interventi/actions";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui/table-skeleton";

const VerificheBiennaliClient = dynamic(
  () => import("@/app/(dashboard)/verifiche-biennali/components/VerificheBiennaliClient").then((m) => m.VerificheBiennaliClient),
  { loading: () => <PageSkeleton /> }
);

const PAGE_SIZE = 25;

export default async function TecnicoVerificheBiennaliPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  const permissions = await getPermissionsForRole(currentUser.role);
  if (!permissions?.VerificheBiennali?.READ) redirect("/tecnici");
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

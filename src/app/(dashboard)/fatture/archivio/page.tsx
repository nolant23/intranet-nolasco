import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getFattureArchivioPaginated } from "../actions";
import { PageSkeleton } from "@/components/ui/table-skeleton";

const FattureClient = dynamic(
  () => import("../components/FattureClient").then((m) => m.FattureClient),
  { loading: () => <PageSkeleton /> }
);

const PAGE_SIZE = 25;

export default async function ArchivioFatturePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions?.Fatture;
  if (!modulePerms?.READ) redirect("/");

  const currentYear = new Date().getFullYear();
  const archiveYears = Array.from({ length: Math.max(0, currentYear - 2020) }, (_, i) => currentYear - 1 - i);
  const { data: initialFatture, total } = await getFattureArchivioPaginated(null, 1, PAGE_SIZE);

  return (
    <FattureClient
      initialFatture={initialFatture}
      initialTotal={total}
      pageSize={PAGE_SIZE}
      permissions={modulePerms}
      isArchive={true}
      archiveYears={archiveYears}
    />
  );
}

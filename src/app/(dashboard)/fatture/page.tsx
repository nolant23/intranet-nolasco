import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getFatturePaginated } from "./actions";
import { PageSkeleton } from "@/components/ui/table-skeleton";

const FattureClient = dynamic(
  () => import("./components/FattureClient").then((m) => m.FattureClient),
  { loading: () => <PageSkeleton /> }
);

const PAGE_SIZE = 25;

export default async function FatturePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions?.Fatture;
  if (!modulePerms?.READ) redirect("/");

  const currentYear = new Date().getFullYear();
  const { data: initialFatture, total } = await getFatturePaginated(currentYear, 1, PAGE_SIZE);

  return (
    <FattureClient
      initialFatture={initialFatture}
      initialTotal={total}
      pageSize={PAGE_SIZE}
      currentYear={currentYear}
      permissions={modulePerms}
    />
  );
}

import { getInterventiArchivioPaginated } from "../actions";
import { InterventiArchivioClient } from "../components/InterventiArchivioClient";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

const PAGE_SIZE = 80;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function InterventiArchivioPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "TECNICO") redirect("/tecnici/servizi/interventi");

  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Archivio?.READ && !permissions?.Interventi?.READ) redirect("/");

  const params = await searchParams;
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const safePage = Number.isNaN(page) ? 1 : page;

  const { data, total } = await getInterventiArchivioPaginated(safePage, PAGE_SIZE);

  return (
    <InterventiArchivioClient
      interventi={data}
      total={total}
      pageSize={PAGE_SIZE}
      currentPage={safePage}
    />
  );
}

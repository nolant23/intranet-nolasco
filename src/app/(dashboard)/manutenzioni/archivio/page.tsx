import { getManutenzioniArchivio, getArchivioFilters } from "../actions";
import { ManutenzioniArchivioClient } from "../components/ManutenzioniArchivioClient";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

const ARCHIVIO_PAGE_SIZE = 80;

type Props = {
  searchParams: Promise<{ anno?: string; comune?: string; page?: string }>;
};

export default async function ManutenzioniArchivioPage({ searchParams }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  if (currentUser.role === "TECNICO") redirect("/tecnici/servizi/manutenzioni");

  const permissions = await getPermissionsForRole(currentUser.role);
  const modulePerms = permissions["Manutenzioni"];
  if (!modulePerms?.READ) redirect("/");

  const params = await searchParams;
  const annoParam = params.anno;
  const comuneParam = params.comune ?? "";
  const pageParam = params.page;
  const anno = annoParam ? parseInt(annoParam, 10) : undefined;
  const comune =
    comuneParam && comuneParam.trim() !== "" ? comuneParam.trim() : undefined;
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  const safePage = Number.isNaN(page) ? 1 : page;

  const [archivioResult, filters] = await Promise.all([
    getManutenzioniArchivio(
      Number.isNaN(anno as number) ? undefined : anno,
      comune,
      safePage,
      ARCHIVIO_PAGE_SIZE
    ),
    getArchivioFilters(),
  ]);

  return (
    <ManutenzioniArchivioClient
      manutenzioni={archivioResult.data}
      total={archivioResult.total}
      pageSize={ARCHIVIO_PAGE_SIZE}
      currentPage={safePage}
      anni={filters.anni}
      comuni={filters.comuni}
      selectedAnno={anno}
      selectedComune={comune ?? ""}
      permissions={modulePerms}
    />
  );
}

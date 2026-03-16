import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getNoteCreditoArchivio } from "../actions";
import { NoteCreditoArchivioClient } from "../components/NoteCreditoArchivioClient";

export default async function NoteCreditoArchivioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions?.Fatture;
  if (!modulePerms?.READ && !permissions?.Archivio?.READ) redirect("/");

  const noteCredito = await getNoteCreditoArchivio();

  return (
    <NoteCreditoArchivioClient
      initialNoteCredito={noteCredito}
      permissions={modulePerms ?? {}}
    />
  );
}

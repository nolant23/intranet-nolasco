import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getTecnici } from "@/app/(dashboard)/presenze/actions";
import { PresenzeClient } from "@/app/(dashboard)/presenze/components/PresenzeClient";

export default async function TecnicoElencoPresenzePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions?.Presenze;
  if (!modulePerms?.READ) redirect("/tecnici/presenze");

  const tecnici = await getTecnici();

  return (
    <PresenzeClient
      tecnici={tecnici}
      permissions={modulePerms}
      currentUser={user}
      backHref="/tecnici/presenze"
    />
  );
}

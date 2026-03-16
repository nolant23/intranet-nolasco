import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getPresenzeCantiere } from "@/app/(dashboard)/tecnici/presenze-cantiere/actions";
import { PresenzeCantiereListClient } from "@/app/(dashboard)/tecnici/presenze-cantiere/PresenzeCantiereListClient";

export default async function TecnicoPresenzeCantierePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  const canAccess =
    permissions?.Tecnici?.READ || permissions?.Booking?.READ || permissions?.PresenzeCantiere?.READ;
  if (!canAccess) redirect("/tecnici");

  const presenze = await getPresenzeCantiere();

  return (
    <PresenzeCantiereListClient
      presenze={presenze}
      currentUser={user}
      permissions={permissions}
      backHref="/tecnici/presenze"
      showImport={false}
      basePath="/tecnici/presenze/presenze-cantiere"
    />
  );
}

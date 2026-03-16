import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getImpianti, getTecnici } from "@/app/(dashboard)/interventi/actions";
import { NuovoInterventoPageClient } from "@/app/(dashboard)/tecnici/nuovo-intervento/NuovoInterventoPageClient";

export default async function TecnicoNuovoInterventoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  const canCreate = permissions?.Interventi?.CREATE ?? permissions?.Interventi?.READ;
  if (!canCreate) redirect("/tecnici");

  const [impianti, tecnici] = await Promise.all([getImpianti(), getTecnici()]);

  return (
    <NuovoInterventoPageClient
      impianti={impianti}
      tecnici={tecnici}
      currentUser={user}
      backHref="/tecnici/servizi/interventi"
      onSuccessRedirect="/tecnici/servizi/interventi"
    />
  );
}

import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getBookingsInCorso } from "@/app/(dashboard)/tecnici/presenze-cantiere/actions";
import { NuovaPresenzaCantierePageClient } from "@/app/(dashboard)/tecnici/presenze-cantiere/nuova/NuovaPresenzaCantierePageClient";

export default async function TecnicoNuovaPresenzaCantierePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Tecnici?.READ && !permissions?.PresenzeCantiere?.CREATE) redirect("/tecnici");

  const bookingsInCorso = await getBookingsInCorso();

  return (
    <NuovaPresenzaCantierePageClient
      bookingsInCorso={bookingsInCorso}
      currentUser={user}
      backHref="/tecnici/presenze/presenze-cantiere"
      onSuccessRedirect="/tecnici/presenze/presenze-cantiere"
    />
  );
}

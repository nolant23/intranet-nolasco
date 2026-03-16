import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getImpiantiDaManutenere, getTecnici } from "@/app/(dashboard)/manutenzioni/actions";
import { NuovaManutenzionePageClient } from "@/app/(dashboard)/tecnici/nuova-manutenzione/NuovaManutenzionePageClient";

export default async function TecnicoNuovaManutenzionePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  const canCreate = permissions?.Manutenzioni?.CREATE ?? permissions?.Manutenzioni?.READ;
  if (!canCreate) redirect("/tecnici");

  const [tecnici, impiantiDaManutenere] = await Promise.all([
    getTecnici(),
    getImpiantiDaManutenere(),
  ]);

  return (
    <NuovaManutenzionePageClient
      impiantiDaManutenere={impiantiDaManutenere}
      tecnici={tecnici}
      currentUser={user}
      backHref="/tecnici/servizi/manutenzioni"
      onSuccessRedirect="/tecnici/servizi/manutenzioni"
    />
  );
}

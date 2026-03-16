import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getImpiantiDaManutenere, getTecnici } from "../../manutenzioni/actions";
import { NuovaManutenzionePageClient } from "./NuovaManutenzionePageClient";

export default async function NuovaManutenzionePage() {
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
    />
  );
}

import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getImpianti, getTecnici } from "../../interventi/actions";
import { NuovaVerificaBiennalePageClient } from "./NuovaVerificaBiennalePageClient";

export default async function NuovaVerificaBiennalePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  const canCreate = permissions?.VerificheBiennali?.CREATE ?? permissions?.VerificheBiennali?.READ;
  if (!canCreate) redirect("/tecnici");

  const [impianti, tecnici] = await Promise.all([getImpianti(), getTecnici()]);

  return (
    <NuovaVerificaBiennalePageClient
      impianti={impianti}
      tecnici={tecnici}
      currentUser={user}
    />
  );
}

import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getBookingsInCorso } from "../actions";
import { NuovaPresenzaCantierePageClient } from "./NuovaPresenzaCantierePageClient";

export default async function NuovaPresenzaCantierePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Tecnici?.READ && !permissions?.PresenzeCantiere?.CREATE) redirect("/tecnici");

  const bookingsInCorso = await getBookingsInCorso();

  return (
    <NuovaPresenzaCantierePageClient
      bookingsInCorso={bookingsInCorso}
      currentUser={user}
    />
  );
}

import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getPresenzeCantiere } from "@/app/(dashboard)/tecnici/presenze-cantiere/actions";
import { PresenzeCantiereListClient } from "@/app/(dashboard)/tecnici/presenze-cantiere/PresenzeCantiereListClient";

export default async function BookingPresenzeCantierePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Booking?.READ && !permissions?.PresenzeCantiere?.READ) redirect("/booking");

  const presenze = await getPresenzeCantiere();

  return (
    <PresenzeCantiereListClient
      presenze={presenze}
      currentUser={user}
      permissions={permissions}
      backHref="/booking"
      showImport={true}
      basePath="/booking/presenze-cantiere"
    />
  );
}

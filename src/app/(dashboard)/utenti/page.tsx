import { getUtenti } from "./actions";
import { UtentiClient } from "./components/UtentiClient";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function UtentiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions["Utenti"];

  if (!modulePerms?.READ) {
    redirect("/");
  }

  const utenti = await getUtenti();

  return <UtentiClient utenti={utenti} permissions={modulePerms} />;
}
